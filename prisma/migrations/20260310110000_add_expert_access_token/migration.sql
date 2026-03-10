-- AlterTable: Add accessToken to Expert
ALTER TABLE "Expert" ADD COLUMN "accessToken" TEXT NOT NULL DEFAULT gen_random_uuid();

-- CreateIndex
CREATE UNIQUE INDEX "Expert_accessToken_key" ON "Expert"("accessToken");
