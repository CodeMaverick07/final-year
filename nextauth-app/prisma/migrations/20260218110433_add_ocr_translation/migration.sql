-- CreateEnum
CREATE TYPE "OcrStatus" AS ENUM ('PENDING', 'PROCESSING', 'RECONSTRUCTING', 'DONE', 'FAILED');

-- CreateEnum
CREATE TYPE "TranslationStatus" AS ENUM ('NONE', 'PROCESSING', 'DONE', 'PARTIAL', 'FAILED');

-- CreateTable
CREATE TABLE "ManuscriptOCR" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "rawOcrText" TEXT NOT NULL,
    "reconstructedText" TEXT,
    "ocrConfidence" DOUBLE PRECISION,
    "ocrStatus" "OcrStatus" NOT NULL DEFAULT 'PENDING',
    "ocrError" TEXT,
    "translationHindi" TEXT,
    "translationEnglish" TEXT,
    "translationStatus" "TranslationStatus" NOT NULL DEFAULT 'NONE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManuscriptOCR_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ManuscriptOCR_postId_key" ON "ManuscriptOCR"("postId");

-- AddForeignKey
ALTER TABLE "ManuscriptOCR" ADD CONSTRAINT "ManuscriptOCR_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
