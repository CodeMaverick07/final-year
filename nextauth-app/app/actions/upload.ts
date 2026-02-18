"use server";

import { auth } from "@/auth";
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

// Step 1: Create post shell + get presigned URLs for each file
export async function initiateUpload(input: CreatePostInput) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

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
      const presignedUrl = await generatePresignedUploadUrl(key, file.type);
      const publicUrl = getPublicUrl(key);

      const mediaType = file.type.startsWith("image/")
        ? "IMAGE" as const
        : file.type.startsWith("audio/")
        ? "AUDIO" as const
        : "VIDEO" as const;

      await prisma.media.create({
        data: {
          postId: post.id,
          type: mediaType,
          url: publicUrl,
          s3Key: key,
          mimeType: file.type,
          size: file.size,
          order,
        },
      });

      return { key, presignedUrl, publicUrl };
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

  // Verify ownership — include ALL media types for smart routing
  const post = await prisma.post.findUnique({
    where: { id: postId, authorId: session.user.id },
    include: { media: { orderBy: { order: "asc" } } },
  });
  if (!post) throw new Error("Post not found");

  // Only process if there is media
  if (post.media.length === 0) return { queued: false };

  // Create OCR stub
  await prisma.manuscriptOCR.create({
    data: { postId, rawOcrText: "", ocrStatus: "PROCESSING" },
  });

  // Route to the correct pipeline based on what media was uploaded
  const images = post.media.filter((m) => m.type === "IMAGE");
  const audios  = post.media.filter((m) => m.type === "AUDIO");
  const videos  = post.media.filter((m) => m.type === "VIDEO");

  const baseHeaders = {
    "Content-Type": "application/json",
    "x-internal-secret": process.env.AUTH_SECRET!,
  };
  const baseUrl = process.env.NEXTAUTH_URL;

  if (images.length > 0) {
    // Existing image OCR pipeline — unchanged
    fetch(`${baseUrl}/api/internal/ocr-pipeline`, {
      method: "POST",
      headers: baseHeaders,
      body: JSON.stringify({ postId, imageUrls: images.map((m) => m.url) }),
    }).catch(console.error);

  } else if (audios.length > 0) {
    // Use first audio file for transcription
    const audio = audios[0];
    fetch(`${baseUrl}/api/internal/audio-pipeline`, {
      method: "POST",
      headers: baseHeaders,
      body: JSON.stringify({
        postId,
        audioUrl: audio.url,
        mimeType: audio.mimeType ?? "audio/mpeg",
      }),
    }).catch(console.error);

  } else if (videos.length > 0) {
    // Use first video file for extraction
    const video = videos[0];
    fetch(`${baseUrl}/api/internal/video-pipeline`, {
      method: "POST",
      headers: baseHeaders,
      body: JSON.stringify({ postId, videoUrl: video.url }),
    }).catch(console.error);

  } else {
    // No processable media — mark as failed
    await prisma.manuscriptOCR.update({
      where: { postId },
      data: { ocrStatus: "FAILED", ocrError: "No processable media found" },
    });
  }

  revalidatePath(`/post/${postId}`);
  return { queued: true };
}
