"use server";

import { auth } from "@/auth";
import { enqueueJob } from "@/lib/jobqueue";
import { prisma } from "@/lib/prisma";
import { generatePresignedUploadUrl, getPublicUrl } from "@/lib/s3";
import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const CreatePostSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  subtitle: z.string().max(300).optional(),
  description: z.string().max(5000).optional(),
  isPublic: z.boolean(),
  tags: z.array(z.string().min(1).max(50)),
  files: z.array(
    z.object({
      name: z.string(),
      type: z.string(),
      size: z.number(),
    })
  ).min(1, "At least one file is required"),
});

export type CreatePostInput = z.infer<typeof CreatePostSchema>;

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif", "bmp", "tif", "tiff"]);
const AUDIO_EXTENSIONS = new Set(["mp3", "wav", "m4a", "ogg", "aac", "flac"]);
const VIDEO_EXTENSIONS = new Set(["mp4", "mov", "webm", "mkv", "avi", "m4v"]);

function inferMediaType(file: { name: string; type: string }) {
  const mime = file.type.toLowerCase();
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";

  const isPdf =
    mime === "application/pdf" ||
    mime === "application/x-pdf" ||
    ext === "pdf";

  if (isPdf) {
    return { mediaType: "IMAGE" as const, mimeType: "application/pdf" };
  }
  if (mime.startsWith("image/") || IMAGE_EXTENSIONS.has(ext)) {
    return { mediaType: "IMAGE" as const, mimeType: file.type || "image/jpeg" };
  }
  if (mime.startsWith("audio/") || AUDIO_EXTENSIONS.has(ext)) {
    return { mediaType: "AUDIO" as const, mimeType: file.type || "audio/mpeg" };
  }
  if (mime.startsWith("video/") || VIDEO_EXTENSIONS.has(ext)) {
    return { mediaType: "VIDEO" as const, mimeType: file.type || "video/mp4" };
  }

  // Keep unknowns processable through image OCR path as a safe default.
  return { mediaType: "IMAGE" as const, mimeType: file.type || "application/octet-stream" };
}

// Step 1: Create post shell + get presigned URLs for each file
export async function initiateUpload(input: CreatePostInput) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userExists = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true },
  });
  if (!userExists) {
    throw new Error("Session is stale. Please sign out and sign in again.");
  }

  const validated = CreatePostSchema.parse(input);

  // Upsert tags
  const tagConnects = await Promise.all(
    validated.tags.map((name) =>
      prisma.tag.upsert({
        where: { name: name.toLowerCase().trim() },
        update: {},
        create: { name: name.toLowerCase().trim() },
        select: { id: true },
      })
    )
  );

  const post = await prisma.post.create({
    data: {
      title: validated.title,
      subtitle: validated.subtitle,
      description: validated.description,
      isPublic: validated.isPublic,
      authorId: session.user.id,
      tags: { create: tagConnects.map((t) => ({ tagId: t.id })) },
    },
  });

  // Generate presigned URLs + media stubs
  const uploads = await Promise.all(
    validated.files.map(async (file, order) => {
      const ext = file.name.split(".").pop();
      const key = `uploads/${session.user!.id}/${post.id}/${nanoid()}.${ext}`;
      const { mediaType, mimeType } = inferMediaType(file);
      const presignedUrl = await generatePresignedUploadUrl(key, mimeType);
      const publicUrl = getPublicUrl(key);

      await prisma.media.create({
        data: {
          postId: post.id,
          type: mediaType,
          url: publicUrl,
          s3Key: key,
          mimeType,
          size: file.size,
          order,
        },
      });

      return { key, presignedUrl, publicUrl, contentType: mimeType };
    })
  );

  revalidatePath("/profile");
  revalidatePath("/feed");
  return { postId: post.id, uploads };
}

/**
 * Called by the client after all S3 PUT uploads succeed.
 * Creates the ManuscriptOCR record and fires the OCR pipeline async.
 */
export async function finalizeUpload(postId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userExists = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true },
  });
  if (!userExists) {
    throw new Error("Session is stale. Please sign out and sign in again.");
  }

  // Verify ownership — include ALL media types for smart routing
  const post = await prisma.post.findUnique({
    where: { id: postId, authorId: session.user.id },
    include: { media: { orderBy: { order: "asc" } } },
  });
  if (!post) throw new Error("Post not found");

  // Only process if there is media
  if (post.media.length === 0) return { queued: false };

  // Create/update OCR stub
  await prisma.manuscriptOCR.upsert({
    where: { postId },
    create: { postId, rawOcrText: "", ocrStatus: "PENDING" },
    update: {
      rawOcrText: "",
      reconstructedText: null,
      ocrStatus: "PENDING",
      ocrError: null,
    },
  });

  // Route to the queue based on uploaded media
  const images = post.media.filter((m) => m.type === "IMAGE");
  const audios  = post.media.filter((m) => m.type === "AUDIO");
  const videos  = post.media.filter((m) => m.type === "VIDEO");

  try {
    if (images.length > 0) {
      await enqueueJob(post.id, "IMAGE_OCR", {
        imageUrls: images.map((m) => m.url),
      });
    } else if (audios.length > 0) {
      const audio = audios[0];
      await enqueueJob(post.id, "AUDIO_TRANSCRIPTION", {
        audioUrl: audio.url,
        mimeType: audio.mimeType ?? "audio/mpeg",
      });
    } else if (videos.length > 0) {
      const video = videos[0];
      await enqueueJob(post.id, "VIDEO_EXTRACTION", {
        videoUrl: video.url,
      });
    } else {
      await prisma.manuscriptOCR.update({
        where: { postId },
        data: { ocrStatus: "FAILED", ocrError: "No processable media found" },
      });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown queue error";
    if (
      message.includes("processingJob") ||
      message.includes("ProcessingJob")
    ) {
      throw new Error(
        "Failed to enqueue processing job: ProcessingJob table missing. Run `npx prisma migrate dev` then `npx prisma generate`."
      );
    }
    throw new Error(`Failed to enqueue processing job: ${message}`);
  }

  // Convert PDFs to page images in background (for frontend carousel rendering).
  // Do not block upload completion/redirect on this potentially slow operation.
  const pdfs = post.media.filter(
    (m) => m.mimeType === "application/pdf" || m.url.toLowerCase().endsWith(".pdf")
  );
  if (pdfs.length > 0 && process.env.AUTH_SECRET) {
    const baseUrl =
      process.env.NEXTAUTH_URL ??
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

    for (const pdf of pdfs) {
      fetch(`${baseUrl}/api/internal/pdf-to-images`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-secret": process.env.AUTH_SECRET,
        },
        body: JSON.stringify({
          postId,
          pdfUrl: pdf.url,
          mediaId: pdf.id,
          insertOrder: pdf.order,
        }),
        cache: "no-store",
      }).catch((err) => {
        console.error("[finalizeUpload] PDF->images background conversion failed:", err);
      });
    }
  }

  // Trigger queue processor immediately so OCR runs without waiting for cron
  const baseUrl = process.env.NEXTAUTH_URL;
  const secret = process.env.CRON_SECRET || process.env.AUTH_SECRET;
  if (baseUrl && secret) {
    fetch(`${baseUrl}/api/cron/process-queue`, {
      method: "GET",
      headers: { authorization: `Bearer ${secret}` },
      cache: "no-store",
    }).catch((err) => {
      console.error("[finalizeUpload] Failed to trigger process-queue:", err);
    });
  }

  revalidatePath(`/post/${postId}`);
  return { queued: true };
}
