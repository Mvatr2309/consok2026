import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const token =
    request.nextUrl.searchParams.get("token") ||
    request.cookies.get("expert_token")?.value;

  if (!token) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const view = request.nextUrl.searchParams.get("view") || "list";
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

  // Calendar view: return all slots for a week
  if (view === "calendar") {
    const weekStartParam = request.nextUrl.searchParams.get("weekStart");
    let weekStart: Date;
    if (weekStartParam) {
      weekStart = new Date(weekStartParam + "T00:00:00+03:00");
    } else {
      // Current week Monday in MSK
      const mskNow = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Moscow" }));
      const day = mskNow.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      weekStart = new Date(mskNow);
      weekStart.setDate(mskNow.getDate() + diff);
      weekStart.setHours(0, 0, 0, 0);
    }
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

    const slots = await prisma.slot.findMany({
      where: {
        expertId: expert.id,
        dateTime: { gte: weekStart, lt: weekEnd },
      },
      include: {
        product: { select: { name: true } },
        bookings: {
          select: { id: true, name: true, email: true, createdAt: true },
          orderBy: { createdAt: "asc" as const },
        },
      },
      orderBy: { dateTime: "asc" },
    });

    return NextResponse.json({
      id: expert.id,
      name: expert.name,
      photo: expert.photo,
      meetingLink: expert.meetingLink,
      weekStart: weekStart.toISOString(),
      slots: slots.map((slot) => ({
        id: slot.id,
        dateTime: slot.dateTime.toISOString(),
        maxParticipants: slot.maxParticipants,
        programName: slot.product.name,
        bookings: slot.bookings,
      })),
    });
  }

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
