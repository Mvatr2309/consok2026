import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const slots = await prisma.slot.findMany({
    include: {
      product: { select: { id: true, name: true } },
      expert: { select: { id: true, name: true, meetingLink: true } },
      _count: { select: { bookings: true } },
    },
    orderBy: { dateTime: "asc" },
  });
  return NextResponse.json(slots);
}

export async function POST(request: NextRequest) {
  const { dateTime, maxParticipants, productId, expertId } = await request.json();
  if (!dateTime || !maxParticipants || !productId || !expertId) {
    return NextResponse.json({ error: "Все поля обязательны" }, { status: 400 });
  }
  const slot = await prisma.slot.create({
    data: {
      dateTime: new Date(dateTime),
      maxParticipants,
      productId,
      expertId,
    },
    include: {
      product: { select: { id: true, name: true } },
      expert: { select: { id: true, name: true, meetingLink: true } },
      _count: { select: { bookings: true } },
    },
  });
  return NextResponse.json(slot);
}

export async function PUT(request: NextRequest) {
  const { id, dateTime, maxParticipants, productId, expertId } = await request.json();
  if (!id) {
    return NextResponse.json({ error: "ID обязателен" }, { status: 400 });
  }
  const slot = await prisma.slot.update({
    where: { id },
    data: {
      dateTime: dateTime ? new Date(dateTime) : undefined,
      maxParticipants: maxParticipants || undefined,
      productId: productId || undefined,
      expertId: expertId || undefined,
    },
    include: {
      product: { select: { id: true, name: true } },
      expert: { select: { id: true, name: true, meetingLink: true } },
      _count: { select: { bookings: true } },
    },
  });
  return NextResponse.json(slot);
}

export async function DELETE(request: NextRequest) {
  const { id } = await request.json();
  await prisma.slot.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
