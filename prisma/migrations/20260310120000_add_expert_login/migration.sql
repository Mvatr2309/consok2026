-- AlterTable: Add login and passwordHash to Expert
ALTER TABLE "Expert" ADD COLUMN "login" TEXT;
ALTER TABLE "Expert" ADD COLUMN "passwordHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Expert_login_key" ON "Expert"("login");
