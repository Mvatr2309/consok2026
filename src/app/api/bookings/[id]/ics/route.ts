import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function fmtUtc(d: Date) {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const bookingId = parseInt(id);
  if (isNaN(bookingId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { slot: { include: { expert: true, product: true } } },
  });

  if (!booking) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const dt = booking.slot.dateTime;
  const end = new Date(dt.getTime() + 60 * 60 * 1000);

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Consultations//RU",
    "BEGIN:VEVENT",
    `DTSTART:${fmtUtc(dt)}`,
    `DTEND:${fmtUtc(end)}`,
    `SUMMARY:Консультация: ${booking.slot.product.name}`,
    `DESCRIPTION:Эксперт: ${booking.slot.expert.name}\\nСсылка: ${booking.slot.expert.meetingLink}`,
    `URL:${booking.slot.expert.meetingLink}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": "attachment; filename=consultation.ics",
    },
  });
}
