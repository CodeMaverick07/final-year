import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { claimNextJob, completeJob, failJob } from "@/lib/jobqueue";
import {
  runGeminiAudioTranscription,
  runGeminiReconstruction,
} from "@/lib/gemini";
import { extractVideoContent } from "@/lib/videointelligence";

export const maxDuration = 300;
const MEDIA_FETCH_TIMEOUT_MS = 45_000;
const OCR_REQUEST_TIMEOUT_MS = 120_000;

class NonRetryableJobError extends Error {}

type ImageQueuePayload = {
  imageUrls?: string[];
};

type AudioQueuePayload = {
  audioUrl?: string;
  mimeType?: string;
};

type VideoQueuePayload = {
  videoUrl?: string;
};

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const authSecret = process.env.AUTH_SECRET;
  const validBearer =
    (cronSecret && authHeader === `Bearer ${cronSecret}`) ||
    (process.env.NODE_ENV === "development" && authSecret && authHeader === `Bearer ${authSecret}`);

  if (!validBearer) {
    return NextResponse.json(
      { error: "Unauthorized. Set CRON_SECRET (or AUTH_SECRET in dev) and pass it as Bearer token." },
      { status: 401 }
    );
  }

  let job: Awaited<ReturnType<typeof claimNextJob>>;
  try {
    job = await claimNextJob();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Failed to claim next job. Did you run Prisma migrations?",
        detail: message,
      },
      { status: 500 }
    );
  }

  if (!job) return NextResponse.json({ message: "No pending jobs" });

  const { id: jobId, postId, jobType, payload, attempts, maxAttempts } = job;

  // Normalize envs (local dev frequently misses these)
  const ocrServiceUrl = process.env.OCR_SERVICE_URL || "http://localhost:8001";

  try {
    await prisma.manuscriptOCR.update({
      where: { postId },
      data: { ocrStatus: "PROCESSING", ocrError: null },
    });

    let rawOcrText: string;

    if (jobType === "IMAGE_OCR") {
      const p = payload as ImageQueuePayload;
      const imageUrls = p.imageUrls ?? [];
      if (imageUrls.length === 0) {
        throw new NonRetryableJobError("Missing imageUrls in job payload");
      }
      const ocrResults = await Promise.allSettled(
        imageUrls.map(async (url) => {
          const imageRes = await fetch(url, {
            signal: AbortSignal.timeout(MEDIA_FETCH_TIMEOUT_MS),
          });
          if (!imageRes.ok) {
            throw new Error(`Failed to fetch media: ${imageRes.status}`);
          }

          const imageBuffer = await imageRes.arrayBuffer();
          const contentType = imageRes.headers.get("content-type") || "";
          const isPdf =
            url.toLowerCase().endsWith(".pdf") ||
            contentType.includes("application/pdf") ||
            contentType.includes("pdf");

          const form = new FormData();
          form.append(
            "file",
            new Blob([imageBuffer], {
              type: isPdf ? "application/pdf" : "image/jpeg",
            }),
            isPdf ? "document.pdf" : "page.jpg"
          );

          const ocrRes = await fetch(`${ocrServiceUrl}/ocr`, {
            method: "POST",
            body: form,
            signal: AbortSignal.timeout(OCR_REQUEST_TIMEOUT_MS),
          });
          let data: { text?: string; error?: string };
          try {
            data = (await ocrRes.json()) as { text?: string; error?: string };
          } catch {
            throw new Error(`OCR service returned invalid JSON (${ocrRes.status})`);
          }
          if (!ocrRes.ok || data.error) {
            throw new Error(data.error || "OCR service request failed");
          }
          const text = typeof data.text === "string" ? data.text.trim() : "";
          return text.length > 0 ? text : null;
        })
      );

      const texts = ocrResults
        .filter((r): r is PromiseFulfilledResult<string | null> => r.status === "fulfilled")
        .map((r) => r.value)
        .filter((value): value is string => Boolean(value));

      if (texts.length === 0) {
        const failures = ocrResults
          .filter((r): r is PromiseRejectedResult => r.status === "rejected")
          .map((r) => String(r.reason))
          .slice(0, 3);
        const details =
          failures.length > 0
            ? ` OCR failures: ${failures.join(" | ")}`
            : " OCR returned empty text for all images.";
        throw new NonRetryableJobError(`No text detected in any image.${details}`);
      }

      rawOcrText = texts.join("\n\n--- Page Break ---\n\n");
    } else if (jobType === "AUDIO_TRANSCRIPTION") {
      const p = payload as AudioQueuePayload;
      if (!p.audioUrl) {
        throw new NonRetryableJobError("Missing audioUrl in job payload");
      }
      rawOcrText = await runGeminiAudioTranscription(
        p.audioUrl,
        p.mimeType ?? "audio/mpeg"
      );
    } else if (jobType === "VIDEO_EXTRACTION") {
      const p = payload as VideoQueuePayload;
      if (!p.videoUrl) {
        throw new NonRetryableJobError("Missing videoUrl in job payload");
      }
      rawOcrText = await extractVideoContent(p.videoUrl);
    } else {
      throw new NonRetryableJobError(`Unknown job type: ${jobType}`);
    }

    await prisma.manuscriptOCR.update({
      where: { postId },
      data: { rawOcrText, ocrStatus: "RECONSTRUCTING" },
    });

    const reconstructedText = await runGeminiReconstruction(rawOcrText);

    await prisma.manuscriptOCR.update({
      where: { postId },
      data: { reconstructedText, ocrStatus: "DONE" },
    });

    await completeJob(jobId);

    return NextResponse.json({
      success: true,
      jobId,
      postId,
      jobType,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const nonRetryable = err instanceof NonRetryableJobError;
    const shouldRetry = !nonRetryable && attempts < maxAttempts;
    console.error("[process-queue] job failed", {
      jobId,
      postId,
      jobType,
      attempts,
      maxAttempts,
      nonRetryable,
      message,
      stack: err instanceof Error ? err.stack : undefined,
    });

    await failJob(jobId, message, attempts, maxAttempts, nonRetryable);

    await prisma.manuscriptOCR
      .update({
        where: { postId },
        data: {
          ocrStatus: shouldRetry ? "PENDING" : "FAILED",
          ocrError: shouldRetry ? null : message,
        },
      })
      .catch(() => {});

    return NextResponse.json(
      {
        error: message,
        jobId,
        postId,
        jobType,
        willRetry: shouldRetry,
        nextAttemptIn: `${attempts * 30}s`,
      },
      { status: 500 }
    );
  }
}
