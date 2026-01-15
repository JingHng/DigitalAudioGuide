/*
  Warnings:

  - You are about to alter the column `title` on the `language` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `lang_code` on the `language` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(10)`.

*/
-- DropForeignKey
ALTER TABLE "audio" DROP CONSTRAINT "audio_exhibit_id_fkey";

-- DropForeignKey
ALTER TABLE "audio" DROP CONSTRAINT "audio_language_id_fkey";

-- DropForeignKey
ALTER TABLE "audio_playback_logs" DROP CONSTRAINT "audio_playback_logs_audio_id_fkey";

-- DropForeignKey
ALTER TABLE "audio_playback_logs" DROP CONSTRAINT "audio_playback_logs_user_id_fkey";

-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_admin_user_id_fkey";

-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_target_user_id_fkey";

-- DropForeignKey
ALTER TABLE "email_verification_token" DROP CONSTRAINT "email_verification_token_user_id_fkey";

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
ALTER TABLE "feedback" DROP CONSTRAINT "feedback_user_id_fkey";

-- DropForeignKey
ALTER TABLE "images" DROP CONSTRAINT "images_exhibit_id_fkey";

-- DropForeignKey
ALTER TABLE "images" DROP CONSTRAINT "images_exhibition_id_fkey";

-- DropForeignKey
ALTER TABLE "language" DROP CONSTRAINT "language_status_id_fkey";

-- DropForeignKey
ALTER TABLE "password_reset_token" DROP CONSTRAINT "password_reset_token_user_id_fkey";

-- DropForeignKey
ALTER TABLE "qr_code" DROP CONSTRAINT "qr_code_exhibit_id_fkey";

-- DropForeignKey
ALTER TABLE "roles_permission" DROP CONSTRAINT "roles_permission_permission_id_fkey";

-- DropForeignKey
ALTER TABLE "roles_permission" DROP CONSTRAINT "roles_permission_role_id_fkey";

-- DropForeignKey
ALTER TABLE "sessions" DROP CONSTRAINT "sessions_user_id_fkey";

-- DropForeignKey
ALTER TABLE "subtitle" DROP CONSTRAINT "subtitle_audio_id_fkey";

-- DropForeignKey
ALTER TABLE "subtitle" DROP CONSTRAINT "subtitle_created_by_fkey";

-- DropForeignKey
ALTER TABLE "subtitle" DROP CONSTRAINT "subtitle_language_id_fkey";

-- DropForeignKey
ALTER TABLE "user" DROP CONSTRAINT "user_status_id_fkey";

-- DropForeignKey
ALTER TABLE "user_badge" DROP CONSTRAINT "user_badge_badge_id_fkey";

-- DropForeignKey
ALTER TABLE "user_badge" DROP CONSTRAINT "user_badge_user_id_fkey";

-- DropForeignKey
ALTER TABLE "userroles" DROP CONSTRAINT "userroles_role_id_fkey";

-- DropForeignKey
ALTER TABLE "userroles" DROP CONSTRAINT "userroles_user_id_fkey";

-- DropIndex
DROP INDEX "exhibit_exhibition_id_idx";

-- DropIndex
DROP INDEX "exhibit_status_id_idx";

-- DropIndex
DROP INDEX "idx_user_badge_badge_id";

-- DropIndex
DROP INDEX "idx_user_badge_user_id";

-- AlterTable
ALTER TABLE "audit_logs" ALTER COLUMN "timestamp" DROP NOT NULL;

-- AlterTable
ALTER TABLE "email_verification_token" ALTER COLUMN "created_at" DROP NOT NULL;

-- AlterTable
ALTER TABLE "exhibit" ALTER COLUMN "exhibition_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "exhibitions" ALTER COLUMN "created_at" DROP NOT NULL,
ALTER COLUMN "updated_at" DROP NOT NULL;

-- AlterTable
ALTER TABLE "images" ALTER COLUMN "is_primary" DROP NOT NULL;

-- AlterTable
ALTER TABLE "language" ALTER COLUMN "title" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "lang_code" SET DATA TYPE VARCHAR(10);

-- AlterTable
ALTER TABLE "password_reset_token" ALTER COLUMN "created_at" DROP NOT NULL;

-- AlterTable
ALTER TABLE "user" ALTER COLUMN "email_verified" DROP NOT NULL;

-- CreateTable
CREATE TABLE "settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "sender_type" (
    "sender_type_id" SERIAL NOT NULL,
    "sender_type" VARCHAR(20) NOT NULL,

    CONSTRAINT "sender_type_pkey" PRIMARY KEY ("sender_type_id")
);

-- CreateTable
CREATE TABLE "conversation" (
    "conversation_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" BIGINT NOT NULL,
    "title" VARCHAR(100),
    "status_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_pkey" PRIMARY KEY ("conversation_id")
);

-- CreateTable
CREATE TABLE "message" (
    "message_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "conversation_id" UUID NOT NULL,
    "sender_type_id" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "status_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_pkey" PRIMARY KEY ("message_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sender_type_sender_type_key" ON "sender_type"("sender_type");

-- CreateIndex
CREATE INDEX "idx_conversation_user_status" ON "conversation"("user_id", "status_id");

-- CreateIndex
CREATE INDEX "idx_message_conversation_status" ON "message"("conversation_id", "status_id", "created_at", "sender_type_id");

-- CreateIndex
CREATE INDEX "idx_email_verification_created_at" ON "email_verification_token"("created_at");

-- CreateIndex
CREATE INDEX "idx_email_verification_expires_at" ON "email_verification_token"("expires_at");

-- CreateIndex
CREATE INDEX "idx_email_verification_token" ON "email_verification_token"("token");

-- CreateIndex
CREATE INDEX "idx_email_verification_user_id" ON "email_verification_token"("user_id");

-- CreateIndex
CREATE INDEX "idx_language_is_default" ON "language"("is_default");

-- CreateIndex
CREATE INDEX "idx_password_reset_created_at" ON "password_reset_token"("created_at");

-- CreateIndex
CREATE INDEX "idx_password_reset_expires_at" ON "password_reset_token"("expires_at");

-- CreateIndex
CREATE INDEX "idx_password_reset_token" ON "password_reset_token"("token");

-- CreateIndex
CREATE INDEX "idx_password_reset_user_id" ON "password_reset_token"("user_id");

-- AddForeignKey
ALTER TABLE "exhibitions" ADD CONSTRAINT "exhibitions_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "status"("status_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "exhibit" ADD CONSTRAINT "exhibit_badge_id_fkey" FOREIGN KEY ("badge_id") REFERENCES "badge"("badge_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "exhibit" ADD CONSTRAINT "exhibit_exhibition_id_fkey" FOREIGN KEY ("exhibition_id") REFERENCES "exhibitions"("exhibition_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "exhibit" ADD CONSTRAINT "exhibit_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "status"("status_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "audio" ADD CONSTRAINT "audio_exhibit_id_fkey" FOREIGN KEY ("exhibit_id") REFERENCES "exhibit"("exhibit_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "audio" ADD CONSTRAINT "audio_language_id_fkey" FOREIGN KEY ("language_id") REFERENCES "language"("language_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "audio_playback_logs" ADD CONSTRAINT "audio_playback_logs_audio_id_fkey" FOREIGN KEY ("audio_id") REFERENCES "audio"("audio_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "audio_playback_logs" ADD CONSTRAINT "audio_playback_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_exhibit_id_fkey" FOREIGN KEY ("exhibit_id") REFERENCES "exhibit"("exhibit_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "images" ADD CONSTRAINT "images_exhibit_id_fkey" FOREIGN KEY ("exhibit_id") REFERENCES "exhibit"("exhibit_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "images" ADD CONSTRAINT "images_exhibition_id_fkey" FOREIGN KEY ("exhibition_id") REFERENCES "exhibitions"("exhibition_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "qr_code" ADD CONSTRAINT "qr_code_exhibit_id_fkey" FOREIGN KEY ("exhibit_id") REFERENCES "exhibit"("exhibit_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "language" ADD CONSTRAINT "language_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "status"("status_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "roles_permission" ADD CONSTRAINT "roles_permission_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("permission_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "roles_permission" ADD CONSTRAINT "roles_permission_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("role_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "subtitle" ADD CONSTRAINT "subtitle_audio_id_fkey" FOREIGN KEY ("audio_id") REFERENCES "audio"("audio_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "subtitle" ADD CONSTRAINT "subtitle_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("user_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "subtitle" ADD CONSTRAINT "subtitle_language_id_fkey" FOREIGN KEY ("language_id") REFERENCES "language"("language_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "status"("status_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "userroles" ADD CONSTRAINT "userroles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("role_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "userroles" ADD CONSTRAINT "userroles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "user"("user_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "user"("user_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "password_reset_token" ADD CONSTRAINT "password_reset_token_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "email_verification_token" ADD CONSTRAINT "email_verification_token_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_badge" ADD CONSTRAINT "user_badge_badge_id_fkey" FOREIGN KEY ("badge_id") REFERENCES "badge"("badge_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_badge" ADD CONSTRAINT "user_badge_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "status"("status_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message" ADD CONSTRAINT "message_sender_type_id_fkey" FOREIGN KEY ("sender_type_id") REFERENCES "sender_type"("sender_type_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message" ADD CONSTRAINT "message_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversation"("conversation_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message" ADD CONSTRAINT "message_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "status"("status_id") ON DELETE RESTRICT ON UPDATE CASCADE;
