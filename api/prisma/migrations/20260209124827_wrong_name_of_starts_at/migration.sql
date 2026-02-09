/*
  Warnings:

  - You are about to drop the column `ends_at` on the `exhibitions` table. All the data in the column will be lost.
  - You are about to drop the column `starts_at` on the `exhibitions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "exhibitions" DROP COLUMN "ends_at",
DROP COLUMN "starts_at",
ADD COLUMN     "endsAt" TIMESTAMPTZ(6),
ADD COLUMN     "startsAt" TIMESTAMPTZ(6);
