import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPublicUrl } from "@/lib/s3";
import { nanoid } from "nanoid";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3, BUCKET } from "@/lib/s3";

export const maxDuration = 300; // 5 minutes for PDF processing

export async function POST(req: NextRequest) {
  // Security: only callable from server
  const secret = req.headers.get("x-internal-secret");
  if (secret !== process.env.AUTH_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const {
    postId,
    pdfUrl,
    mediaId,
    insertOrder,
  }: {
    postId: string;
    pdfUrl: string;
    mediaId?: string;
    insertOrder?: number;
  } = await req.json();

  try {
    // Fetch PDF from S3
    const pdfResponse = await fetch(pdfUrl);
    if (!pdfResponse.ok) {
      throw new Error(`Failed to fetch PDF: ${pdfResponse.statusText}`);
    }
    const pdfBuffer = await pdfResponse.arrayBuffer();

    // Convert PDF to images using OCR service
    const form = new FormData();
    form.append("file", new Blob([pdfBuffer], { type: "application/pdf" }), "document.pdf");

    const ocrServiceUrl = process.env.OCR_SERVICE_URL || "http://localhost:8001";
    const convertResponse = await fetch(`${ocrServiceUrl}/pdf-to-images`, {
      method: "POST",
      body: form,
    });

    if (!convertResponse.ok) {
      let errorMessage = `PDF conversion failed: ${convertResponse.status} ${convertResponse.statusText}`;
      try {
        const error = await convertResponse.json();
        errorMessage = error.error || errorMessage;
      } catch {
        // If response is not JSON, use status text
      }
      
      // If 404, provide helpful message
      if (convertResponse.status === 404) {
        errorMessage =
          "PDF conversion endpoint not found at OCR_SERVICE_URL. Start the standalone OCR server from /ocr/app.py on port 8001.";
      }
      
      throw new Error(errorMessage);
    }

    const { images } = await convertResponse.json(); // Array of base64 images

    if (!images || images.length === 0) {
      throw new Error("No pages found in PDF");
    }

    // Get the post to find user ID
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: {
        authorId: true,
        media: {
          select: { id: true, url: true, s3Key: true, mimeType: true, order: true },
          orderBy: { order: "asc" },
        },
      },
    });

    if (!post) {
      throw new Error("Post not found");
    }

    // Delete original PDF media record
    const pdfMedia =
      post.media.find((m) => (mediaId ? m.id === mediaId : false)) ??
      post.media.find((m) => m.url === pdfUrl) ??
      post.media.find(
        (m) => m.mimeType === "application/pdf" || m.url.toLowerCase().endsWith(".pdf")
      ) ??
      null;

    const pageStartOrder = typeof insertOrder === "number"
      ? insertOrder
      : pdfMedia?.order ?? 0;

    if (pdfMedia) {
      await prisma.media.delete({ where: { id: pdfMedia.id } });
    }

    // Upload each page as an image to S3 and create Media records
    const mediaRecords = await Promise.all(
      images.map(async (base64Image: string, index: number) => {
        // Convert base64 to buffer
        const base64Data = base64Image.includes(",") ? base64Image.split(",")[1] : base64Image;
        const imageBuffer = Buffer.from(base64Data, "base64");

        // Generate S3 key
        const key = `uploads/${post.authorId}/${postId}/${nanoid()}.png`;

        // Upload to S3
        await s3.send(
          new PutObjectCommand({
            Bucket: BUCKET,
            Key: key,
            Body: imageBuffer,
            ContentType: "image/png",
          })
        );

        const publicUrl = getPublicUrl(key);

        // Create Media record
        const media = await prisma.media.create({
          data: {
            postId,
            type: "IMAGE",
            url: publicUrl,
            s3Key: key,
            mimeType: "image/png",
            size: imageBuffer.length,
            order: pageStartOrder + index,
          },
        });

        return media;
      })
    );

    // Reindex media orders to keep deterministic carousel order after replacement.
    const allMedia = await prisma.media.findMany({
      where: { postId },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      select: { id: true },
    });

    await Promise.all(
      allMedia.map((media, idx) =>
        prisma.media.update({
          where: { id: media.id },
          data: { order: idx },
        })
      )
    );

    return NextResponse.json({
      success: true,
      mediaCount: mediaRecords.length,
      imageUrls: mediaRecords.map((m) => m.url),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("PDF to images conversion failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
