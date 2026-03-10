import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendCancellation } from "@/lib/mail";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export async function GET() {
  const bookings = await prisma.booking.findMany({
    include: {
      slot: {
        include: {
          product: { select: { name: true } },
          expert: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(bookings);
}

export async function DELETE(request: Request) {
  const { id } = await request.json();

  // Fetch booking with related data before deleting
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      slot: { include: { expert: true, product: true } },
      telegramSub: true,
    },
  });

  if (!booking) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Send cancellation email
  sendCancellation({
    to: booking.email,
    userName: booking.name,
    expertName: booking.slot.expert.name,
    programName: booking.slot.product.name,
    dateTime: booking.slot.dateTime,
  }).catch((err) => console.error("Cancellation email error:", err));

  // Send Telegram cancellation if subscribed
  if (booking.telegramSub && BOT_TOKEN) {
    const dt = booking.slot.dateTime.toLocaleString("ru-RU", {
      weekday: "short", day: "numeric", month: "long",
      hour: "2-digit", minute: "2-digit", timeZone: "Europe/Moscow",
    });
    fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: booking.telegramSub.chatId,
        text: `❌ Консультация отменена\n\n📋 ${booking.slot.product.name}\n👤 Эксперт: ${booking.slot.expert.name}\n🕐 ${dt} (МСК)\n\nЕсли у вас есть вопросы, свяжитесь с нами.`,
      }),
    }).catch((err) => console.error("Telegram cancellation error:", err));
  }

  // Delete related records and booking
  await prisma.consent.deleteMany({ where: { bookingId: id } });
  await prisma.telegramSub.deleteMany({ where: { bookingId: id } });
  await prisma.booking.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
