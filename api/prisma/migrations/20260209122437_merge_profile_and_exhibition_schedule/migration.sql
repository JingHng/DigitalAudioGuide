/*
  Warnings:

  - Added the required column `first_name` to the `user` table without a default value. This is not possible if the table is not empty.
  - Added the required column `last_name` to the `user` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ConsentType" AS ENUM ('MARKETING', 'PICTURE');

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "address_line1" VARCHAR(255),
ADD COLUMN     "address_line2" VARCHAR(255),
ADD COLUMN     "first_name" VARCHAR(100) NOT NULL,
ADD COLUMN     "last_name" VARCHAR(100) NOT NULL,
ADD COLUMN     "phone_number" CHAR(8),
ADD COLUMN     "zip_code" BIGINT;

-- CreateTable
CREATE TABLE "UserConsent" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "type" "ConsentType" NOT NULL,
    "granted" BOOLEAN NOT NULL DEFAULT false,
    "consentText" TEXT,
    "version" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserConsent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "home_floating_card" (
    "card_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" VARCHAR(100) NOT NULL,
    "icon" VARCHAR(50) NOT NULL,
    "link_url" VARCHAR(255) NOT NULL,
    "position" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "home_floating_card_pkey" PRIMARY KEY ("card_id")
);

-- CreateIndex
CREATE INDEX "UserConsent_user_id_idx" ON "UserConsent"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "UserConsent_user_id_type_key" ON "UserConsent"("user_id", "type");

-- CreateIndex
CREATE INDEX "idx_floating_card_position" ON "home_floating_card"("position");

-- CreateIndex
CREATE INDEX "idx_floating_card_active" ON "home_floating_card"("is_active");

-- AddForeignKey
ALTER TABLE "UserConsent" ADD CONSTRAINT "UserConsent_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
