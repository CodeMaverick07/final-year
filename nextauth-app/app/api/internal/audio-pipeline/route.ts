// NOTE: This route is no longer called by the app.
// Processing is now handled by the cron queue at /api/cron/process-queue
// Kept for manual debugging only.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runGeminiAudioTranscription, runGeminiReconstruction } from "@/lib/gemini";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-internal-secret");
  if (secret !== process.env.AUTH_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { postId, audioUrl, mimeType }: {
    postId: string;
    audioUrl: string;
    mimeType: string;
  } = await req.json();

  try {
    // ── Step 1: Transcribe audio via Gemini ───────────────────────────────────
    await prisma.manuscriptOCR.update({
      where: { postId },
      data: { ocrStatus: "PROCESSING" },
    });

    const rawOcrText = await runGeminiAudioTranscription(audioUrl, mimeType);

    await prisma.manuscriptOCR.update({
      where: { postId },
      data: { rawOcrText, ocrStatus: "RECONSTRUCTING" },
    });

    // ── Step 2: Gemini reconstruction (same as image pipeline) ────────────────
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
