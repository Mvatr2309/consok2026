import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Файл не загружен" }, { status: 400 });
    }

    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim() && !l.trim().startsWith("#"));

    // Skip header
    if (lines.length < 2) {
      return NextResponse.json({ error: "Файл пуст или содержит только заголовок" }, { status: 400 });
    }

    // Get all experts and products for name->id mapping
    const experts = await prisma.expert.findMany();
    const products = await prisma.product.findMany();

    const expertMap = new Map(experts.map((e) => [e.name.toLowerCase(), e.id]));
    const productMap = new Map(products.map((p) => [p.name.toLowerCase(), p.id]));

    // Also map by ID
    for (const e of experts) expertMap.set(String(e.id), e.id);
    for (const p of products) productMap.set(String(p.id), p.id);

    const errors: string[] = [];
    const created: number[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Parse CSV (simple: split by semicolon or comma)
      const sep = line.includes(";") ? ";" : ",";
      const parts = line.split(sep).map((s) => s.trim().replace(/^"|"$/g, ""));

      if (parts.length < 4) {
        errors.push(`Строка ${i + 1}: недостаточно колонок (нужно минимум 4)`);
        continue;
      }

      const [expertVal, productVal, dateTimeVal, maxPartVal] = parts;

      const expertId = expertMap.get(expertVal.toLowerCase()) || expertMap.get(expertVal);
      if (!expertId) {
        errors.push(`Строка ${i + 1}: эксперт "${expertVal}" не найден`);
        continue;
      }

      const productId = productMap.get(productVal.toLowerCase()) || productMap.get(productVal);
      if (!productId) {
        errors.push(`Строка ${i + 1}: программа "${productVal}" не найдена`);
        continue;
      }

      const dateTime = new Date(dateTimeVal);
      if (isNaN(dateTime.getTime())) {
        errors.push(`Строка ${i + 1}: некорректная дата "${dateTimeVal}"`);
        continue;
      }

      const maxParticipants = parseInt(maxPartVal);
      if (isNaN(maxParticipants) || maxParticipants < 1) {
        errors.push(`Строка ${i + 1}: некорректное кол-во участников "${maxPartVal}"`);
        continue;
      }

      try {
        const slot = await prisma.slot.create({
          data: { dateTime, maxParticipants, productId, expertId },
        });
        created.push(slot.id);
      } catch (err) {
        errors.push(`Строка ${i + 1}: ошибка создания — ${err}`);
      }
    }

    return NextResponse.json({
      created: created.length,
      errors,
    });
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json({ error: "Ошибка импорта" }, { status: 500 });
  }
}
