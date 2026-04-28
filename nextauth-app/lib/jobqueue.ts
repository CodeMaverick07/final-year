import { prisma } from "@/lib/prisma";
import { JobStatus, JobType, Prisma } from "@prisma/client";

export type ImageJobPayload = {
  imageUrls: string[];
};

export type AudioJobPayload = {
  audioUrl: string;
  mimeType: string;
};

export type VideoJobPayload = {
  videoUrl: string;
};

export type JobPayload = ImageJobPayload | AudioJobPayload | VideoJobPayload;

export async function enqueueJob(
  postId: string,
  jobType: JobType,
  payload: JobPayload
) {
  return prisma.processingJob.upsert({
    where: { postId },
    create: {
      postId,
      jobType,
      status: "PENDING",
      payload: payload as Prisma.InputJsonValue,
    },
    update: {
      jobType,
      status: "PENDING",
      attempts: 0,
      lastError: null,
      completedAt: null,
      startedAt: null,
      scheduledAt: new Date(),
      payload: payload as Prisma.InputJsonValue,
    },
  });
}

export async function claimNextJob() {
  return prisma.$transaction(async (tx) => {
    const candidates = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM "ProcessingJob"
      WHERE status = 'PENDING'::"JobStatus"
        AND attempts < "maxAttempts"
        AND "scheduledAt" <= NOW()
      ORDER BY "scheduledAt" ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    `;

    const candidate = candidates[0];
    if (!candidate) return null;

    const job = await tx.processingJob.update({
      where: { id: candidate.id },
      data: {
        status: "RUNNING",
        startedAt: new Date(),
        attempts: { increment: 1 },
      },
    });

    return job;
  });
}

export async function completeJob(jobId: string) {
  return prisma.processingJob.update({
    where: { id: jobId },
    data: { status: "DONE", completedAt: new Date() },
  });
}

export async function failJob(
  jobId: string,
  error: string,
  attempts: number,
  maxAttempts: number,
  forceExhausted = false
) {
  const status: JobStatus =
    forceExhausted || attempts >= maxAttempts ? "EXHAUSTED" : "PENDING";
  const scheduledAt =
    status === "PENDING"
      ? new Date(Date.now() + attempts * 30_000)
      : new Date();

  return prisma.processingJob.update({
    where: { id: jobId },
    data: { status, lastError: error, scheduledAt },
  });
}
