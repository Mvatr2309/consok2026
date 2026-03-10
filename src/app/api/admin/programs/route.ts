import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const programs = await prisma.product.findMany({
    include: { experts: { select: { id: true, name: true } } },
    orderBy: { id: "asc" },
  });
  return NextResponse.json(programs);
}

export async function POST(request: NextRequest) {
  const { name, description, expertIds } = await request.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "Название обязательно" }, { status: 400 });
  }
  const program = await prisma.product.create({
    data: {
      name: name.trim(),
      description: description?.trim() || "",
      experts: expertIds?.length ? { connect: expertIds.map((id: number) => ({ id })) } : undefined,
    },
    include: { experts: { select: { id: true, name: true } } },
  });
  return NextResponse.json(program);
}

export async function PUT(request: NextRequest) {
  const { id, name, description, expertIds } = await request.json();
  if (!id || !name?.trim()) {
    return NextResponse.json({ error: "ID и название обязательны" }, { status: 400 });
  }
  const program = await prisma.product.update({
    where: { id },
    data: {
      name: name.trim(),
      description: description?.trim() || "",
      experts: { set: expertIds?.map((eid: number) => ({ id: eid })) || [] },
    },
    include: { experts: { select: { id: true, name: true } } },
  });
  return NextResponse.json(program);
}

export async function DELETE(request: NextRequest) {
  const { id } = await request.json();
  await prisma.product.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
