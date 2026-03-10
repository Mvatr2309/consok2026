import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const bookings = await prisma.booking.findMany({
    include: {
      slot: {
        include: {
          product: { select: { name: true } },
          expert: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(bookings);
}

export async function DELETE(request: Request) {
  const { id } = await request.json();
  await prisma.consent.deleteMany({ where: { bookingId: id } });
  await prisma.telegramSub.deleteMany({ where: { bookingId: id } });
  await prisma.booking.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
