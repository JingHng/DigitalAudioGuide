/*
  Warnings:

  - You are about to drop the `Account` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Role` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Task` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserProfile` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserRole` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Account" DROP CONSTRAINT "Account_userId_fkey";

-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "Task_assignedToId_fkey";

-- DropForeignKey
ALTER TABLE "UserProfile" DROP CONSTRAINT "UserProfile_userId_fkey";

-- DropForeignKey
ALTER TABLE "UserRole" DROP CONSTRAINT "UserRole_roleId_fkey";

-- DropForeignKey
ALTER TABLE "UserRole" DROP CONSTRAINT "UserRole_userId_fkey";

-- DropTable
DROP TABLE "Account";

-- DropTable
DROP TABLE "Role";

-- DropTable
DROP TABLE "Task";

-- DropTable
DROP TABLE "User";

-- DropTable
DROP TABLE "UserProfile";

-- DropTable
DROP TABLE "UserRole";

-- DropEnum
DROP TYPE "AuthProvider";

-- CreateTable
CREATE TABLE "audio" (
    "audio_id" SERIAL NOT NULL,
    "exhibit_id" BIGINT,
    "language_id" BIGINT,
    "file_url" VARCHAR(512),
    "title" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audio_pkey" PRIMARY KEY ("audio_id")
);

-- CreateTable
CREATE TABLE "audio_playback_logs" (
    "audio_logs_id" SERIAL NOT NULL,
    "user_id" BIGINT,
    "audio_id" INTEGER,
    "audio_start" TIMESTAMPTZ(6),
    "audio_end" TIMESTAMPTZ(6),
    "duration_listened" INTEGER,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audio_playback_logs_pkey" PRIMARY KEY ("audio_logs_id")
);

-- CreateTable
CREATE TABLE "exhibitions" (
    "exhibition_id" BIGSERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status_id" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "exhibitions_pkey" PRIMARY KEY ("exhibition_id")
);

-- CreateTable
CREATE TABLE "exhibit" (
    "exhibit_id" BIGSERIAL NOT NULL,
    "exhibition_id" BIGINT NOT NULL,
    "badge_id" BIGINT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status_id" INTEGER,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exhibit_pkey" PRIMARY KEY ("exhibit_id")
);

-- CreateTable
CREATE TABLE "feedback" (
    "feedback_id" BIGSERIAL NOT NULL,
    "user_id" BIGINT,
    "exhibit_id" BIGINT,
    "rating" INTEGER,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("feedback_id")
);

-- CreateTable
CREATE TABLE "images" (
    "image_id" BIGSERIAL NOT NULL,
    "exhibit_id" BIGINT,
    "exhibition_id" BIGINT,
    "title" TEXT,
    "description" TEXT,
    "file_url" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "images_pkey" PRIMARY KEY ("image_id")
);

-- CreateTable
CREATE TABLE "language" (
    "language_id" BIGSERIAL NOT NULL,
    "status_id" INTEGER,
    "title" TEXT NOT NULL,
    "lang_code" TEXT NOT NULL,
    "is_default" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "language_pkey" PRIMARY KEY ("language_id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "permission_id" SERIAL NOT NULL,
    "permission_name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("permission_id")
);

-- CreateTable
CREATE TABLE "qr_code" (
    "qr_id" SERIAL NOT NULL,
    "exhibit_id" BIGINT NOT NULL,
    "qr_url" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "qr_code_pkey" PRIMARY KEY ("qr_id")
);

-- CreateTable
CREATE TABLE "roles" (
    "role_id" SERIAL NOT NULL,
    "role_name" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("role_id")
);

-- CreateTable
CREATE TABLE "roles_permission" (
    "role_id" INTEGER NOT NULL,
    "permission_id" INTEGER NOT NULL,

    CONSTRAINT "roles_permission_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "session_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" BIGINT NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("session_id")
);

-- CreateTable
CREATE TABLE "status" (
    "status_id" SERIAL NOT NULL,
    "status_name" VARCHAR(30) NOT NULL,

    CONSTRAINT "status_pkey" PRIMARY KEY ("status_id")
);

-- CreateTable
CREATE TABLE "subtitle" (
    "subtitle_id" BIGSERIAL NOT NULL,
    "audio_id" INTEGER,
    "language_id" BIGINT,
    "text" JSONB,
    "created_by" BIGINT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subtitle_pkey" PRIMARY KEY ("subtitle_id")
);

-- CreateTable
CREATE TABLE "user" (
    "user_id" BIGSERIAL NOT NULL,
    "username" VARCHAR(100) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "password_hash" VARCHAR(72) NOT NULL,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "status_id" INTEGER,
    "last_login_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "userroles" (
    "user_id" BIGINT NOT NULL,
    "role_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "userroles_pkey" PRIMARY KEY ("user_id","role_id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "audit_log_id" BIGSERIAL NOT NULL,
    "admin_user_id" BIGINT,
    "target_user_id" BIGINT,
    "resource" VARCHAR(50) NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "changes" TEXT,
    "metadata" TEXT,
    "timestamp" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("audit_log_id")
);

-- CreateTable
CREATE TABLE "password_reset_token" (
    "password_reset_id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "token" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "password_reset_token_pkey" PRIMARY KEY ("password_reset_id")
);

-- CreateTable
CREATE TABLE "email_verification_token" (
    "email_verification_id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "token" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "email_verification_token_pkey" PRIMARY KEY ("email_verification_id")
);

-- CreateTable
CREATE TABLE "badge" (
    "badge_id" BIGSERIAL NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "image_url" VARCHAR(512),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "badge_pkey" PRIMARY KEY ("badge_id")
);

-- CreateTable
CREATE TABLE "user_badge" (
    "user_id" BIGINT NOT NULL,
    "badge_id" BIGINT NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_badge_pkey" PRIMARY KEY ("user_id","badge_id")
);

-- CreateIndex
CREATE INDEX "idx_audio_exhibit_id" ON "audio"("exhibit_id");

-- CreateIndex
CREATE INDEX "idx_audio_language_id" ON "audio"("language_id");

-- CreateIndex
CREATE INDEX "idx_audio_title" ON "audio"("title");

-- CreateIndex
CREATE INDEX "idx_audio_created_at" ON "audio"("created_at");

-- CreateIndex
CREATE INDEX "idx_audio_exhibit_language" ON "audio"("exhibit_id", "language_id");

-- CreateIndex
CREATE INDEX "idx_audio_playback_logs_user_id" ON "audio_playback_logs"("user_id");

-- CreateIndex
CREATE INDEX "idx_audio_playback_logs_audio_id" ON "audio_playback_logs"("audio_id");

-- CreateIndex
CREATE INDEX "idx_audio_playback_logs_created_at" ON "audio_playback_logs"("created_at");

-- CreateIndex
CREATE INDEX "idx_audio_playback_logs_audio_start" ON "audio_playback_logs"("audio_start");

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
CREATE INDEX "idx_feedback_user_id" ON "feedback"("user_id");

-- CreateIndex
CREATE INDEX "idx_feedback_exhibit_id" ON "feedback"("exhibit_id");

-- CreateIndex
CREATE INDEX "idx_feedback_rating" ON "feedback"("rating");

-- CreateIndex
CREATE INDEX "idx_feedback_created_at" ON "feedback"("created_at");

-- CreateIndex
CREATE INDEX "idx_feedback_user_exhibit" ON "feedback"("user_id", "exhibit_id");

-- CreateIndex
CREATE INDEX "images_exhibit_id_idx" ON "images"("exhibit_id");

-- CreateIndex
CREATE INDEX "images_exhibition_id_idx" ON "images"("exhibition_id");

-- CreateIndex
CREATE UNIQUE INDEX "language_lang_code_key" ON "language"("lang_code");

-- CreateIndex
CREATE INDEX "idx_language_status" ON "language"("status_id");

-- CreateIndex
CREATE INDEX "idx_language_code" ON "language"("lang_code");

-- CreateIndex
CREATE INDEX "idx_language_is_default" ON "language"("is_default");

-- CreateIndex
CREATE INDEX "idx_language_title" ON "language"("title");

-- CreateIndex
CREATE UNIQUE INDEX "idx_language_is_default_unique" ON "language"("is_default");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_permission_name_key" ON "permissions"("permission_name");

-- CreateIndex
CREATE INDEX "idx_permissions_name" ON "permissions"("permission_name");

-- CreateIndex
CREATE INDEX "idx_qr_code_exhibit_id" ON "qr_code"("exhibit_id");

-- CreateIndex
CREATE INDEX "idx_qr_code_url" ON "qr_code"("qr_url");

-- CreateIndex
CREATE UNIQUE INDEX "roles_role_name_key" ON "roles"("role_name");

-- CreateIndex
CREATE INDEX "idx_roles_name" ON "roles"("role_name");

-- CreateIndex
CREATE INDEX "idx_roles_permission_role_id" ON "roles_permission"("role_id");

-- CreateIndex
CREATE INDEX "idx_roles_permission_permission_id" ON "roles_permission"("permission_id");

-- CreateIndex
CREATE INDEX "idx_sessions_user_id" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "idx_sessions_created_at" ON "sessions"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "status_status_name_key" ON "status"("status_name");

-- CreateIndex
CREATE INDEX "idx_subtitle_audio_id" ON "subtitle"("audio_id");

-- CreateIndex
CREATE INDEX "idx_subtitle_language_id" ON "subtitle"("language_id");

-- CreateIndex
CREATE INDEX "idx_subtitle_created_by" ON "subtitle"("created_by");

-- CreateIndex
CREATE INDEX "idx_subtitle_created_at" ON "subtitle"("created_at");

-- CreateIndex
CREATE INDEX "idx_subtitle_audio_language" ON "subtitle"("audio_id", "language_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_username_key" ON "user"("username");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE INDEX "idx_user_status" ON "user"("status_id");

-- CreateIndex
CREATE INDEX "idx_user_username" ON "user"("username");

-- CreateIndex
CREATE INDEX "idx_user_email" ON "user"("email");

-- CreateIndex
CREATE INDEX "idx_user_created_at" ON "user"("created_at");

-- CreateIndex
CREATE INDEX "idx_user_last_login" ON "user"("last_login_at");

-- CreateIndex
CREATE INDEX "idx_user_email_status" ON "user"("email", "status_id");

-- CreateIndex
CREATE INDEX "idx_userroles_user_id" ON "userroles"("user_id");

-- CreateIndex
CREATE INDEX "idx_userroles_role_id" ON "userroles"("role_id");

-- CreateIndex
CREATE INDEX "idx_audit_logs_admin_user_id" ON "audit_logs"("admin_user_id");

-- CreateIndex
CREATE INDEX "idx_audit_logs_target_user_id" ON "audit_logs"("target_user_id");

-- CreateIndex
CREATE INDEX "idx_audit_logs_resource" ON "audit_logs"("resource");

-- CreateIndex
CREATE INDEX "idx_audit_logs_action" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "idx_audit_logs_timestamp" ON "audit_logs"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_token_token_key" ON "password_reset_token"("token");

-- CreateIndex
CREATE UNIQUE INDEX "email_verification_token_token_key" ON "email_verification_token"("token");

-- CreateIndex
CREATE INDEX "idx_user_badge_user_id" ON "user_badge"("user_id");

-- CreateIndex
CREATE INDEX "idx_user_badge_badge_id" ON "user_badge"("badge_id");

-- AddForeignKey
ALTER TABLE "audio" ADD CONSTRAINT "audio_exhibit_id_fkey" FOREIGN KEY ("exhibit_id") REFERENCES "exhibit"("exhibit_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audio" ADD CONSTRAINT "audio_language_id_fkey" FOREIGN KEY ("language_id") REFERENCES "language"("language_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audio_playback_logs" ADD CONSTRAINT "audio_playback_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audio_playback_logs" ADD CONSTRAINT "audio_playback_logs_audio_id_fkey" FOREIGN KEY ("audio_id") REFERENCES "audio"("audio_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exhibitions" ADD CONSTRAINT "exhibitions_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "status"("status_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exhibit" ADD CONSTRAINT "exhibit_exhibition_id_fkey" FOREIGN KEY ("exhibition_id") REFERENCES "exhibitions"("exhibition_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exhibit" ADD CONSTRAINT "exhibit_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "status"("status_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exhibit" ADD CONSTRAINT "exhibit_badge_id_fkey" FOREIGN KEY ("badge_id") REFERENCES "badge"("badge_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_exhibit_id_fkey" FOREIGN KEY ("exhibit_id") REFERENCES "exhibit"("exhibit_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "images" ADD CONSTRAINT "images_exhibit_id_fkey" FOREIGN KEY ("exhibit_id") REFERENCES "exhibit"("exhibit_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "images" ADD CONSTRAINT "images_exhibition_id_fkey" FOREIGN KEY ("exhibition_id") REFERENCES "exhibitions"("exhibition_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "language" ADD CONSTRAINT "language_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "status"("status_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qr_code" ADD CONSTRAINT "qr_code_exhibit_id_fkey" FOREIGN KEY ("exhibit_id") REFERENCES "exhibit"("exhibit_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles_permission" ADD CONSTRAINT "roles_permission_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("role_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles_permission" ADD CONSTRAINT "roles_permission_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("permission_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subtitle" ADD CONSTRAINT "subtitle_audio_id_fkey" FOREIGN KEY ("audio_id") REFERENCES "audio"("audio_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subtitle" ADD CONSTRAINT "subtitle_language_id_fkey" FOREIGN KEY ("language_id") REFERENCES "language"("language_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subtitle" ADD CONSTRAINT "subtitle_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "status"("status_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "userroles" ADD CONSTRAINT "userroles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "userroles" ADD CONSTRAINT "userroles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("role_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "user"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "user"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_token" ADD CONSTRAINT "password_reset_token_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_verification_token" ADD CONSTRAINT "email_verification_token_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_badge" ADD CONSTRAINT "user_badge_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_badge" ADD CONSTRAINT "user_badge_badge_id_fkey" FOREIGN KEY ("badge_id") REFERENCES "badge"("badge_id") ON DELETE CASCADE ON UPDATE CASCADE;
