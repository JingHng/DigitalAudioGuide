/*
  Warnings:

  - You are about to drop the column `course_id` on the `audio` table. All the data in the column will be lost.
  - You are about to drop the column `course_id` on the `feedback` table. All the data in the column will be lost.
  - You are about to drop the column `course_id` on the `images` table. All the data in the column will be lost.
  - You are about to drop the column `school_id` on the `images` table. All the data in the column will be lost.
  - You are about to alter the column `file_url` on the `images` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(512)`.
  - You are about to drop the column `course_id` on the `qr_code` table. All the data in the column will be lost.
  - You are about to alter the column `qr_url` on the `qr_code` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to drop the `courses` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `schools` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `exhibit_id` to the `qr_code` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "audio" DROP CONSTRAINT "audio_course_id_fkey";

-- DropForeignKey
ALTER TABLE "courses" DROP CONSTRAINT "courses_badge_id_fkey";

-- DropForeignKey
ALTER TABLE "courses" DROP CONSTRAINT "courses_school_id_fkey";

-- DropForeignKey
ALTER TABLE "courses" DROP CONSTRAINT "courses_status_id_fkey";

-- DropForeignKey
ALTER TABLE "feedback" DROP CONSTRAINT "feedback_course_id_fkey";

-- DropForeignKey
ALTER TABLE "images" DROP CONSTRAINT "images_course_id_fkey";

-- DropForeignKey
ALTER TABLE "images" DROP CONSTRAINT "images_school_id_fkey";

-- DropForeignKey
ALTER TABLE "qr_code" DROP CONSTRAINT "qr_code_course_id_fkey";

-- DropForeignKey
ALTER TABLE "schools" DROP CONSTRAINT "schools_status_id_fkey";

-- DropIndex
DROP INDEX "idx_audio_course_id";

-- DropIndex
DROP INDEX "idx_audio_course_language";

-- DropIndex
DROP INDEX "idx_feedback_course_id";

-- DropIndex
DROP INDEX "idx_feedback_user_course";

-- DropIndex
DROP INDEX "idx_image_course_id";

-- DropIndex
DROP INDEX "idx_image_school_id";

-- DropIndex
DROP INDEX "idx_language_is_default";

-- DropIndex
DROP INDEX "idx_language_is_default_unique";

-- DropIndex
DROP INDEX "idx_qr_code_course_id";

-- AlterTable
ALTER TABLE "audio" DROP COLUMN "course_id",
ADD COLUMN     "exhibit_id" BIGINT;

-- AlterTable
ALTER TABLE "feedback" DROP COLUMN "course_id",
ADD COLUMN     "exhibit_id" BIGINT;

-- AlterTable
ALTER TABLE "images" DROP COLUMN "course_id",
DROP COLUMN "school_id",
ADD COLUMN     "exhibit_id" BIGINT,
ADD COLUMN     "exhibition_id" BIGINT,
ALTER COLUMN "file_url" SET DATA TYPE VARCHAR(512);

-- AlterTable
ALTER TABLE "qr_code" DROP COLUMN "course_id",
ADD COLUMN     "exhibit_id" BIGINT NOT NULL,
ALTER COLUMN "qr_url" SET DATA TYPE VARCHAR(255);

-- DropTable
DROP TABLE "courses";

-- DropTable
DROP TABLE "schools";

-- CreateTable
CREATE TABLE "exhibitions" (
    "exhibition_id" BIGSERIAL NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "status_id" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exhibitions_pkey" PRIMARY KEY ("exhibition_id")
);

-- CreateTable
CREATE TABLE "exhibit" (
    "exhibit_id" BIGSERIAL NOT NULL,
    "exhibition_id" BIGINT NOT NULL,
    "badge_id" BIGINT,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "additional_description" TEXT,
    "status_id" INTEGER,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exhibit_pkey" PRIMARY KEY ("exhibit_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "exhibitions_title_key" ON "exhibitions"("title");

-- CreateIndex
CREATE UNIQUE INDEX "exhibit_badge_id_key" ON "exhibit"("badge_id");

-- CreateIndex
CREATE INDEX "idx_exhibit_title" ON "exhibit"("title");

-- CreateIndex
CREATE INDEX "idx_exhibit_created_at" ON "exhibit"("created_at");

-- CreateIndex
CREATE INDEX "exhibit_exhibition_id_idx" ON "exhibit"("exhibition_id");

-- CreateIndex
CREATE INDEX "exhibit_status_id_idx" ON "exhibit"("status_id");

-- CreateIndex
CREATE INDEX "idx_audio_exhibit_id" ON "audio"("exhibit_id");

-- CreateIndex
CREATE INDEX "idx_audio_exhibit_language" ON "audio"("exhibit_id", "language_id");

-- CreateIndex
CREATE INDEX "idx_feedback_exhibit_id" ON "feedback"("exhibit_id");

-- CreateIndex
CREATE INDEX "idx_feedback_user_exhibit" ON "feedback"("user_id", "exhibit_id");

-- CreateIndex
CREATE INDEX "idx_images_exhibit_id" ON "images"("exhibit_id");

-- CreateIndex
CREATE INDEX "idx_images_exhibition_id" ON "images"("exhibition_id");

-- CreateIndex
CREATE INDEX "idx_images_is_primary" ON "images"("is_primary");

-- CreateIndex
CREATE INDEX "idx_images_title" ON "images"("title");

-- CreateIndex
CREATE INDEX "idx_qr_code_exhibit_id" ON "qr_code"("exhibit_id");

-- AddForeignKey
ALTER TABLE "exhibitions" ADD CONSTRAINT "exhibitions_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "status"("status_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exhibit" ADD CONSTRAINT "exhibit_exhibition_id_fkey" FOREIGN KEY ("exhibition_id") REFERENCES "exhibitions"("exhibition_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exhibit" ADD CONSTRAINT "exhibit_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "status"("status_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exhibit" ADD CONSTRAINT "exhibit_badge_id_fkey" FOREIGN KEY ("badge_id") REFERENCES "badge"("badge_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audio" ADD CONSTRAINT "audio_exhibit_id_fkey" FOREIGN KEY ("exhibit_id") REFERENCES "exhibit"("exhibit_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_exhibit_id_fkey" FOREIGN KEY ("exhibit_id") REFERENCES "exhibit"("exhibit_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "images" ADD CONSTRAINT "images_exhibit_id_fkey" FOREIGN KEY ("exhibit_id") REFERENCES "exhibit"("exhibit_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "images" ADD CONSTRAINT "images_exhibition_id_fkey" FOREIGN KEY ("exhibition_id") REFERENCES "exhibitions"("exhibition_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qr_code" ADD CONSTRAINT "qr_code_exhibit_id_fkey" FOREIGN KEY ("exhibit_id") REFERENCES "exhibit"("exhibit_id") ON DELETE CASCADE ON UPDATE CASCADE;
