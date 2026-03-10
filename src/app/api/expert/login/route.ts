import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";

export async function POST(request: NextRequest) {
  const { login, password } = await request.json();

  if (!login || !password) {
    return NextResponse.json({ error: "Введите логин и пароль" }, { status: 400 });
  }

  const expert = await prisma.expert.findUnique({
    where: { login },
    select: { accessToken: true, passwordHash: true },
  });

  if (!expert || !expert.passwordHash) {
    return NextResponse.json({ error: "Неверный логин или пароль" }, { status: 401 });
  }

  if (!verifyPassword(password, expert.passwordHash)) {
    return NextResponse.json({ error: "Неверный логин или пароль" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set("expert_token", expert.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  return response;
}
