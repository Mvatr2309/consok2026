import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Токен не указан" }, { status: 401 });
  }

  const expert = await prisma.expert.findUnique({
    where: { accessToken: token },
    include: {
      slots: {
        where: { dateTime: { gte: new Date() } },
        include: {
          product: { select: { name: true } },
          bookings: {
            select: { id: true, name: true, email: true, createdAt: true },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { dateTime: "asc" },
      },
    },
  });

  if (!expert) {
    return NextResponse.json({ error: "Неверный токен" }, { status: 401 });
  }

  return NextResponse.json({
    id: expert.id,
    name: expert.name,
    photo: expert.photo,
    meetingLink: expert.meetingLink,
    slots: expert.slots.map((slot) => ({
      id: slot.id,
      dateTime: slot.dateTime.toISOString(),
      maxParticipants: slot.maxParticipants,
      programName: slot.product.name,
      bookings: slot.bookings,
    })),
  });
}
