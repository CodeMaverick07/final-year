import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const ocr = await prisma.manuscriptOCR.findUnique({
    where: { postId: id },
    select: { ocrStatus: true, translationStatus: true },
  });
  return NextResponse.json(ocr ?? { ocrStatus: "PENDING", translationStatus: "NONE" });
}
