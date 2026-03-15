import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: NextRequest) {
  const token =
    request.nextUrl.searchParams.get("token") ||
    request.cookies.get("expert_token")?.value;

  if (!token) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const expert = await prisma.expert.findUnique({
    where: { accessToken: token },
    select: { id: true },
  });

  if (!expert) {
    return NextResponse.json({ error: "Неверный токен" }, { status: 401 });
  }

  const { bookingId, attended } = await request.json();

  // Verify booking belongs to this expert's slot
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { slot: { select: { expertId: true } } },
  });

  if (!booking || booking.slot.expertId !== expert.id) {
    return NextResponse.json({ error: "Запись не найдена" }, { status: 404 });
  }

  await prisma.booking.update({
    where: { id: bookingId },
    data: { attended: Boolean(attended) },
  });

  return NextResponse.json({ ok: true });
}
