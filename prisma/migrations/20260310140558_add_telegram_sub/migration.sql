-- AlterTable
ALTER TABLE "Expert" ALTER COLUMN "accessToken" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Settings" ALTER COLUMN "id" SET DEFAULT 1,
ALTER COLUMN "id" DROP DEFAULT;
DROP SEQUENCE "Settings_id_seq";

-- CreateTable
CREATE TABLE "TelegramSub" (
    "id" SERIAL NOT NULL,
    "chatId" TEXT NOT NULL,
    "bookingId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelegramSub_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TelegramSub_bookingId_key" ON "TelegramSub"("bookingId");

-- AddForeignKey
ALTER TABLE "TelegramSub" ADD CONSTRAINT "TelegramSub_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
