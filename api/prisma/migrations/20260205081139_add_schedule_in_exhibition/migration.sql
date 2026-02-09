-- AlterTable
ALTER TABLE "exhibitions" ADD COLUMN     "ends_at" TIMESTAMPTZ(6),
ADD COLUMN     "starts_at" TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "date_of_birth" DATE,
ADD COLUMN     "gender" VARCHAR(10),
ADD COLUMN     "language_id" BIGINT;

-- CreateIndex
CREATE INDEX "idx_exhibit_exhibition_id" ON "exhibit"("exhibition_id");

-- CreateIndex
CREATE INDEX "idx_exhibit_status" ON "exhibit"("status_id");

-- CreateIndex
CREATE INDEX "idx_exhibit_badge_id" ON "exhibit"("badge_id");

-- CreateIndex
CREATE INDEX "idx_exhibit_sequence" ON "exhibit"("sequence");

-- CreateIndex
CREATE INDEX "idx_exhibitions_status" ON "exhibitions"("status_id");

-- CreateIndex
CREATE INDEX "idx_exhibitions_created_at" ON "exhibitions"("created_at");

-- CreateIndex
CREATE INDEX "idx_exhibitions_title" ON "exhibitions"("title");

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_language_id_fkey" FOREIGN KEY ("language_id") REFERENCES "language"("language_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "idx_exhibition_sequence" RENAME TO "idx_exhibit_exhibition_sequence";
