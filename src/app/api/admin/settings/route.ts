import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const rows = await prisma.settings.findMany();
  const settings: Record<string, string> = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  return NextResponse.json(settings);
}

export async function PUT(request: NextRequest) {
  const body = await request.json();

  for (const [key, value] of Object.entries(body)) {
    const existing = await prisma.settings.findUnique({ where: { key } });
    if (existing) {
      await prisma.settings.update({
        where: { key },
        data: { value: String(value) },
      });
    } else {
      await prisma.settings.create({
        data: { key, value: String(value) },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
