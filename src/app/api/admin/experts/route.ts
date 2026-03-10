import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const experts = await prisma.expert.findMany({
    include: { products: { select: { id: true, name: true } } },
    orderBy: { id: "asc" },
  });
  return NextResponse.json(experts);
}

export async function POST(request: NextRequest) {
  const { name, photo, description, meetingLink, productIds } = await request.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "Имя обязательно" }, { status: 400 });
  }
  const expert = await prisma.expert.create({
    data: {
      name: name.trim(),
      photo: photo || "/experts/default.jpg",
      description: description?.trim() || "",
      meetingLink: meetingLink?.trim() || "",
      products: productIds?.length ? { connect: productIds.map((id: number) => ({ id })) } : undefined,
    },
    include: { products: { select: { id: true, name: true } } },
  });
  return NextResponse.json(expert);
}

export async function PUT(request: NextRequest) {
  const { id, name, photo, description, meetingLink, productIds } = await request.json();
  if (!id || !name?.trim()) {
    return NextResponse.json({ error: "ID и имя обязательны" }, { status: 400 });
  }
  const expert = await prisma.expert.update({
    where: { id },
    data: {
      name: name.trim(),
      photo: photo || undefined,
      description: description?.trim() || "",
      meetingLink: meetingLink?.trim() ?? undefined,
      products: { set: productIds?.map((pid: number) => ({ id: pid })) || [] },
    },
    include: { products: { select: { id: true, name: true } } },
  });
  return NextResponse.json(expert);
}

export async function DELETE(request: NextRequest) {
  const { id } = await request.json();
  await prisma.expert.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
