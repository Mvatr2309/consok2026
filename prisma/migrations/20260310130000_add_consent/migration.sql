-- CreateTable: Consent
CREATE TABLE "Consent" (
    "id" SERIAL NOT NULL,
    "bookingId" INTEGER NOT NULL,
    "personalData" BOOLEAN NOT NULL,
    "meetingRecording" BOOLEAN NOT NULL,
    "cookiePolicy" BOOLEAN NOT NULL,
    "ip" TEXT NOT NULL DEFAULT '',
    "userAgent" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Consent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Consent_bookingId_key" ON "Consent"("bookingId");

-- AddForeignKey
ALTER TABLE "Consent" ADD CONSTRAINT "Consent_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
