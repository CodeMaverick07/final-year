"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { runGeminiTranslation } from "@/lib/gemini";
import { revalidatePath } from "next/cache";

export async function requestTranslation(postId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const ocr = await prisma.manuscriptOCR.findUnique({ where: { postId } });
  if (!ocr) throw new Error("OCR record not found");
  if (!ocr.reconstructedText) throw new Error("Reconstruction not complete yet");

  // ── Guard: already translated — return cached values ─────────────────────
  if (ocr.translationStatus === "DONE") {
    return {
      hindi: ocr.translationHindi,
      english: ocr.translationEnglish,
      cached: true,
    };
  }

  // ── Guard: translation in progress ───────────────────────────────────────
  if (ocr.translationStatus === "PROCESSING") {
    return { error: "Translation already in progress", cached: false };
  }

  // ── Mark as processing ────────────────────────────────────────────────────
  await prisma.manuscriptOCR.update({
    where: { postId },
    data: { translationStatus: "PROCESSING" },
  });

  try {
    // Single Gemini call for BOTH languages
    const { hindi, english } = await runGeminiTranslation(ocr.reconstructedText);

    await prisma.manuscriptOCR.update({
      where: { postId },
      data: {
        translationHindi: hindi,
        translationEnglish: english,
        translationStatus: "DONE",
      },
    });

    revalidatePath(`/post/${postId}`);
    return { hindi, english, cached: false };
  } catch (err: unknown) {
    await prisma.manuscriptOCR.update({
      where: { postId },
      data: { translationStatus: "FAILED" },
    });
    throw err;
  }
}
