-- CreateEnum
CREATE TYPE "PostSource" AS ENUM ('UPLOAD', 'CAPTURE', 'RECORD');

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "sourceType" "PostSource" NOT NULL DEFAULT 'UPLOAD';
