import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";

export async function GET() {
  const experts = await prisma.expert.findMany({
    include: { products: { select: { id: true, name: true } } },
    orderBy: { id: "asc" },
  });
  return NextResponse.json(experts);
}

export async function POST(request: NextRequest) {
  const { name, photo, description, meetingLink, productIds, login, password } = await request.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "Имя обязательно" }, { status: 400 });
  }
  if (login) {
    const existing = await prisma.expert.findUnique({ where: { login } });
    if (existing) {
      return NextResponse.json({ error: "Этот логин уже занят" }, { status: 400 });
    }
  }
  const expert = await prisma.expert.create({
    data: {
      name: name.trim(),
      photo: photo || "/experts/default.jpg",
      description: description?.trim() || "",
      meetingLink: meetingLink?.trim() || "",
      login: login?.trim() || null,
      passwordHash: password ? hashPassword(password) : null,
      products: productIds?.length ? { connect: productIds.map((id: number) => ({ id })) } : undefined,
    },
    include: { products: { select: { id: true, name: true } } },
  });
  return NextResponse.json(expert);
}

export async function PUT(request: NextRequest) {
  const { id, name, photo, description, meetingLink, productIds, login, password } = await request.json();
  if (!id || !name?.trim()) {
    return NextResponse.json({ error: "ID и имя обязательны" }, { status: 400 });
  }
  if (login) {
    const existing = await prisma.expert.findUnique({ where: { login } });
    if (existing && existing.id !== id) {
      return NextResponse.json({ error: "Этот логин уже занят" }, { status: 400 });
    }
  }
  const data: Record<string, unknown> = {
    name: name.trim(),
    photo: photo || undefined,
    description: description?.trim() || "",
    meetingLink: meetingLink?.trim() ?? undefined,
    login: login?.trim() || null,
    products: { set: productIds?.map((pid: number) => ({ id: pid })) || [] },
  };
  if (password) {
    data.passwordHash = hashPassword(password);
  }
  const expert = await prisma.expert.update({
    where: { id },
    data,
    include: { products: { select: { id: true, name: true } } },
  });
  return NextResponse.json(expert);
}

export async function DELETE(request: NextRequest) {
  const { id } = await request.json();
  await prisma.expert.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
