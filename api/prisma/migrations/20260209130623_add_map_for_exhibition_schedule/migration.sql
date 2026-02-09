/*
  Warnings:

  - You are about to drop the column `endsAt` on the `exhibitions` table. All the data in the column will be lost.
  - You are about to drop the column `startsAt` on the `exhibitions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "exhibitions" DROP COLUMN "endsAt",
DROP COLUMN "startsAt",
ADD COLUMN     "ends_at" TIMESTAMPTZ(6),
ADD COLUMN     "starts_at" TIMESTAMPTZ(6);
