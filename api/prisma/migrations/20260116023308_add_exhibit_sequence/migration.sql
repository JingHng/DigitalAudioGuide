/*
  Warnings:

  - A unique constraint covering the columns `[exhibition_id,sequence]` on the table `exhibit` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "exhibit" ADD COLUMN     "sequence" INTEGER;

-- CreateIndex
CREATE INDEX "idx_exhibition_sequence" ON "exhibit"("exhibition_id", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "unique_exhibition_sequence" ON "exhibit"("exhibition_id", "sequence");
