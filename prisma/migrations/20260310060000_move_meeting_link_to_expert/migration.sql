-- AlterTable: Add meetingLink to Expert
ALTER TABLE "Expert" ADD COLUMN "meetingLink" TEXT NOT NULL DEFAULT '';

-- AlterTable: Add reminderSentAt to Booking
ALTER TABLE "Booking" ADD COLUMN "reminderSentAt" TIMESTAMP(3);

-- CreateTable: Settings
CREATE TABLE "Settings" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Settings_key_key" ON "Settings"("key");

-- AlterTable: Remove meetingLink from Slot
ALTER TABLE "Slot" DROP COLUMN "meetingLink";
