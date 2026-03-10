import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "Файл не загружен" }, { status: 400 });
  }

  const ext = path.extname(file.name) || ".jpg";
  const filename = `expert-${Date.now()}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const filePath = path.join(process.cwd(), "public", "experts", filename);

  await writeFile(filePath, buffer);

  return NextResponse.json({ path: `/experts/${filename}` });
}
