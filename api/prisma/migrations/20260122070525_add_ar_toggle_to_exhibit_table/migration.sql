-- AlterTable
ALTER TABLE "exhibit" ADD COLUMN     "ar_experience_url" VARCHAR(2048),
ADD COLUMN     "is_ar_enabled" BOOLEAN NOT NULL DEFAULT false;
