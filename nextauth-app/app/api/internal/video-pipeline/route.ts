// NOTE: This route is no longer called by the app.
// Processing is now handled by the cron queue at /api/cron/process-queue
// Kept for manual debugging only.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runGeminiReconstruction } from "@/lib/gemini";
import { extractVideoContent } from "@/lib/videointelligence";

export const maxDuration = 300; // video jobs take longer — allow 5 min

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-internal-secret");
  if (secret !== process.env.AUTH_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { postId, videoUrl }: { postId: string; videoUrl: string } = await req.json();

  try {
    // ── Step 1: Extract text + speech via Video Intelligence API ──────────────
    await prisma.manuscriptOCR.update({
      where: { postId },
      data: { ocrStatus: "PROCESSING" },
    });

    const rawOcrText = await extractVideoContent(videoUrl);

    await prisma.manuscriptOCR.update({
      where: { postId },
      data: { rawOcrText, ocrStatus: "RECONSTRUCTING" },
    });

    // ── Step 2: Gemini reconstruction (same as image and audio pipelines) ─────
    const reconstructedText = await runGeminiReconstruction(rawOcrText);

    await prisma.manuscriptOCR.update({
      where: { postId },
      data: { reconstructedText, ocrStatus: "DONE" },
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await prisma.manuscriptOCR
      .update({
        where: { postId },
        data: { ocrStatus: "FAILED", ocrError: message },
      })
      .catch(() => {});
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
