/*
  Warnings:

  - You are about to drop the column `exhibit_id` on the `audio` table. All the data in the column will be lost.
  - You are about to drop the column `exhibit_id` on the `feedback` table. All the data in the column will be lost.
  - You are about to drop the column `exhibit_id` on the `images` table. All the data in the column will be lost.
  - You are about to drop the column `exhibition_id` on the `images` table. All the data in the column will be lost.
  - You are about to drop the column `exhibit_id` on the `qr_code` table. All the data in the column will be lost.
  - You are about to drop the `exhibit` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `exhibitions` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `course_id` to the `qr_code` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "audio" DROP CONSTRAINT "audio_exhibit_id_fkey";

-- DropForeignKey
ALTER TABLE "exhibit" DROP CONSTRAINT "exhibit_badge_id_fkey";

-- DropForeignKey
ALTER TABLE "exhibit" DROP CONSTRAINT "exhibit_exhibition_id_fkey";

-- DropForeignKey
ALTER TABLE "exhibit" DROP CONSTRAINT "exhibit_status_id_fkey";

-- DropForeignKey
ALTER TABLE "exhibitions" DROP CONSTRAINT "exhibitions_status_id_fkey";

-- DropForeignKey
ALTER TABLE "feedback" DROP CONSTRAINT "feedback_exhibit_id_fkey";

-- DropForeignKey
ALTER TABLE "images" DROP CONSTRAINT "images_exhibit_id_fkey";

-- DropForeignKey
ALTER TABLE "images" DROP CONSTRAINT "images_exhibition_id_fkey";

-- DropForeignKey
ALTER TABLE "qr_code" DROP CONSTRAINT "qr_code_exhibit_id_fkey";

-- DropIndex
DROP INDEX "idx_audio_exhibit_id";

-- DropIndex
DROP INDEX "idx_audio_exhibit_language";

-- DropIndex
DROP INDEX "idx_feedback_exhibit_id";

-- DropIndex
DROP INDEX "idx_feedback_user_exhibit";

-- DropIndex
DROP INDEX "images_exhibit_id_idx";

-- DropIndex
DROP INDEX "images_exhibition_id_idx";

-- DropIndex
DROP INDEX "idx_qr_code_exhibit_id";

-- AlterTable
ALTER TABLE "audio" DROP COLUMN "exhibit_id",
ADD COLUMN     "course_id" BIGINT;

-- AlterTable
ALTER TABLE "feedback" DROP COLUMN "exhibit_id",
ADD COLUMN     "course_id" BIGINT;

-- AlterTable
ALTER TABLE "images" DROP COLUMN "exhibit_id",
DROP COLUMN "exhibition_id",
ADD COLUMN     "course_id" BIGINT,
ADD COLUMN     "school_id" BIGINT;

-- AlterTable
ALTER TABLE "qr_code" DROP COLUMN "exhibit_id",
ADD COLUMN     "course_id" BIGINT NOT NULL;

-- DropTable
DROP TABLE "exhibit";

-- DropTable
DROP TABLE "exhibitions";

-- CreateTable
CREATE TABLE "schools" (
    "school_id" BIGSERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status_id" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "schools_pkey" PRIMARY KEY ("school_id")
);

-- CreateTable
CREATE TABLE "courses" (
    "course_id" BIGSERIAL NOT NULL,
    "school_id" BIGINT NOT NULL,
    "badge_id" BIGINT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status_id" INTEGER,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("course_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "schools_title_key" ON "schools"("title");

-- CreateIndex
CREATE UNIQUE INDEX "courses_badge_id_key" ON "courses"("badge_id");

-- CreateIndex
CREATE INDEX "idx_course_title" ON "courses"("title");

-- CreateIndex
CREATE INDEX "idx_course_created_at" ON "courses"("created_at");

-- CreateIndex
CREATE INDEX "courses_school_id_idx" ON "courses"("school_id");

-- CreateIndex
CREATE INDEX "courses_status_id_idx" ON "courses"("status_id");

-- CreateIndex
CREATE INDEX "idx_audio_course_id" ON "audio"("course_id");

-- CreateIndex
CREATE INDEX "idx_audio_course_language" ON "audio"("course_id", "language_id");

-- CreateIndex
CREATE INDEX "idx_feedback_course_id" ON "feedback"("course_id");

-- CreateIndex
CREATE INDEX "idx_feedback_user_course" ON "feedback"("user_id", "course_id");

-- CreateIndex
CREATE INDEX "idx_image_course_id" ON "images"("course_id");

-- CreateIndex
CREATE INDEX "idx_image_school_id" ON "images"("school_id");

-- CreateIndex
CREATE INDEX "idx_qr_code_course_id" ON "qr_code"("course_id");

-- AddForeignKey
ALTER TABLE "schools" ADD CONSTRAINT "schools_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "status"("status_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("school_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "status"("status_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_badge_id_fkey" FOREIGN KEY ("badge_id") REFERENCES "badge"("badge_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audio" ADD CONSTRAINT "audio_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("course_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("course_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "images" ADD CONSTRAINT "images_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("course_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "images" ADD CONSTRAINT "images_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("school_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qr_code" ADD CONSTRAINT "qr_code_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("course_id") ON DELETE CASCADE ON UPDATE CASCADE;
