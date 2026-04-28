import { prisma } from "@/lib/prisma";
import { enqueueJob } from "@/lib/jobqueue";
import { NextResponse } from "next/server";

const jobSelect = {
  status: true,
  attempts: true,
  maxAttempts: true,
  scheduledAt: true,
  lastError: true,
} as const;

async function ensureProcessingJob(postId: string) {
  const existing = await prisma.processingJob.findUnique({
    where: { postId },
    select: jobSelect,
  });
  if (existing) return existing;

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: {
      media: {
        select: { type: true, url: true, mimeType: true },
        orderBy: { order: "asc" },
      },
    },
  });

  if (!post || post.media.length === 0) return null;

  const images = post.media.filter((m) => m.type === "IMAGE");
  const audios = post.media.filter((m) => m.type === "AUDIO");
  const videos = post.media.filter((m) => m.type === "VIDEO");

  if (images.length > 0) {
    await enqueueJob(postId, "IMAGE_OCR", {
      imageUrls: images.map((m) => m.url),
    });
  } else if (audios.length > 0) {
    const audio = audios[0];
    await enqueueJob(postId, "AUDIO_TRANSCRIPTION", {
      audioUrl: audio.url,
      mimeType: audio.mimeType ?? "audio/mpeg",
    });
  } else if (videos.length > 0) {
    const video = videos[0];
    await enqueueJob(postId, "VIDEO_EXTRACTION", {
      videoUrl: video.url,
    });
  } else {
    return null;
  }

  return prisma.processingJob.findUnique({
    where: { postId },
    select: jobSelect,
  });
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const [ocr, job] = await Promise.all([
    prisma.manuscriptOCR.findUnique({
      where: { postId: params.id },
      select: { ocrStatus: true, translationStatus: true, ocrError: true },
    }),
    prisma.processingJob.findUnique({
      where: { postId: params.id },
      select: jobSelect,
    }),
  ]);

  let resolvedJob = job;
  if (
    ocr &&
    !job &&
    (ocr.ocrStatus === "PENDING" || ocr.ocrStatus === "PROCESSING")
  ) {
    try {
      resolvedJob = await ensureProcessingJob(params.id);
    } catch (err: unknown) {
      console.error("[ocr-status] failed to auto-enqueue missing job", {
        postId: params.id,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return NextResponse.json({
    ocrStatus: ocr?.ocrStatus ?? "PENDING",
    translationStatus: ocr?.translationStatus ?? "NONE",
    ocrError: ocr?.ocrError ?? null,
    job: resolvedJob
      ? {
          status: resolvedJob.status,
          attempts: resolvedJob.attempts,
          maxAttempts: resolvedJob.maxAttempts,
          nextRetryAt:
            resolvedJob.status === "PENDING" ? resolvedJob.scheduledAt : null,
          lastError: resolvedJob.lastError,
        }
      : null,
  });
}
