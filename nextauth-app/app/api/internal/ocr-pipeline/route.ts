import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runGeminiReconstruction } from "@/lib/gemini";

export const maxDuration = 120; // Allow up to 2 min for this route

export async function POST(req: NextRequest) {
  // Security: only callable from server
  const secret = req.headers.get("x-internal-secret");
  if (secret !== process.env.AUTH_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { postId, imageUrls }: { postId: string; imageUrls: string[] } = await req.json();

  try {
    // ── Step 1: OCR each image via FastAPI ───────────────────────────────────
    const ocrResults = await Promise.allSettled(
      imageUrls.map(async (url) => {
        // Fetch image bytes, forward as multipart to FastAPI
        const imageRes = await fetch(url);
        const imageBuffer = await imageRes.arrayBuffer();

        const form = new FormData();
        form.append("file", new Blob([imageBuffer], { type: "image/jpeg" }), "page.jpg");

        const ocrRes = await fetch(`${process.env.OCR_SERVICE_URL}/ocr`, {
          method: "POST",
          body: form,
        });
        const data = await ocrRes.json();
        if (data.error) throw new Error(data.error);
        return data.text as string;
      })
    );

    const succeededTexts = ocrResults
      .filter((r): r is PromiseFulfilledResult<string> => r.status === "fulfilled")
      .map((r) => r.value);

    const rawOcrText = succeededTexts.join("\n\n--- Page Break ---\n\n");

    if (!rawOcrText.trim()) {
      await prisma.manuscriptOCR.update({
        where: { postId },
        data: { ocrStatus: "FAILED", ocrError: "No text detected in any image" },
      });
      return NextResponse.json({ error: "No text detected" });
    }

    // Save raw OCR immediately
    await prisma.manuscriptOCR.update({
      where: { postId },
      data: { rawOcrText, ocrStatus: "RECONSTRUCTING" },
    });

    // ── Step 2: Gemini reconstruction ────────────────────────────────────────
    const reconstructedText = await runGeminiReconstruction(rawOcrText);

    await prisma.manuscriptOCR.update({
      where: { postId },
      data: { reconstructedText, ocrStatus: "DONE" },
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await prisma.manuscriptOCR.update({
      where: { postId },
      data: { ocrStatus: "FAILED", ocrError: message },
    }).catch(() => {});
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
