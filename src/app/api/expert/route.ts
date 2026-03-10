import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const token =
    request.nextUrl.searchParams.get("token") ||
    request.cookies.get("expert_token")?.value;

  if (!token) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const tab = request.nextUrl.searchParams.get("tab") || "upcoming";
  const page = parseInt(request.nextUrl.searchParams.get("page") || "1", 10);
  const perPage = 10;

  const expert = await prisma.expert.findUnique({
    where: { accessToken: token },
    select: { id: true, name: true, photo: true, meetingLink: true },
  });

  if (!expert) {
    return NextResponse.json({ error: "Неверный токен" }, { status: 401 });
  }

  const now = new Date();
  const isArchive = tab === "archive";

  const where = {
    expertId: expert.id,
    dateTime: isArchive ? { lt: now } : { gte: now },
  };

  const [slots, total] = await Promise.all([
    prisma.slot.findMany({
      where,
      include: {
        product: { select: { name: true } },
        bookings: {
          select: { id: true, name: true, email: true, createdAt: true },
          orderBy: { createdAt: "asc" as const },
        },
      },
      orderBy: { dateTime: isArchive ? "desc" as const : "asc" as const },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.slot.count({ where }),
  ]);

  return NextResponse.json({
    id: expert.id,
    name: expert.name,
    photo: expert.photo,
    meetingLink: expert.meetingLink,
    total,
    page,
    totalPages: Math.ceil(total / perPage),
    slots: slots.map((slot) => ({
      id: slot.id,
      dateTime: slot.dateTime.toISOString(),
      maxParticipants: slot.maxParticipants,
      programName: slot.product.name,
      bookings: slot.bookings,
    })),
  });
}
