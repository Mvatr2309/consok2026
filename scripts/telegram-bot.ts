import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const API = `https://api.telegram.org/bot${BOT_TOKEN}`;

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

let lastUpdateId = 0;

async function callTg(method: string, body?: Record<string, unknown>) {
  const res = await fetch(`${API}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

function formatDateTime(dt: Date): string {
  return dt.toLocaleString("ru-RU", {
    weekday: "short",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Moscow",
  });
}

async function handleUpdate(update: { update_id: number; message?: { chat: { id: number }; text?: string } }) {
  if (!update.message?.text) return;

  const chatId = update.message.chat.id;
  const text = update.message.text;

  // Only handle /start with deep link — ignore everything else
  if (!text.startsWith("/start")) return;

  const parts = text.split(" ");

  if (parts.length < 2 || !parts[1].startsWith("booking_")) {
    // Plain /start without deep link — short info and ignore
    await callTg("sendMessage", {
      chat_id: chatId,
      text: "Этот бот отправляет напоминания о консультациях.\n\nЗапишитесь на сайте и нажмите «Напоминание в Telegram».",
    });
    return;
  }

  const bookingId = parseInt(parts[1].replace("booking_", ""));
  if (isNaN(bookingId)) return;

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { slot: { include: { expert: true, product: true } } },
  });

  if (!booking) {
    await callTg("sendMessage", { chat_id: chatId, text: "Запись не найдена." });
    return;
  }

  // Check if consultation already passed
  if (booking.slot.dateTime < new Date()) {
    await callTg("sendMessage", { chat_id: chatId, text: "Эта консультация уже прошла." });
    return;
  }

  // Check if already subscribed
  const existing = await prisma.telegramSub.findUnique({ where: { bookingId } });
  if (existing) {
    await callTg("sendMessage", {
      chat_id: chatId,
      text: "Вы уже подписаны на напоминание для этой консультации! ✅",
    });
    return;
  }

  await prisma.telegramSub.create({
    data: { chatId: chatId.toString(), bookingId },
  });

  await callTg("sendMessage", {
    chat_id: chatId,
    text: `Готово! ✅ Я напомню вам о консультации.\n\n📋 Программа: ${booking.slot.product.name}\n👤 Эксперт: ${booking.slot.expert.name}\n🕐 ${formatDateTime(booking.slot.dateTime)} (МСК)\n\nНапоминание придёт за 1 час до встречи.`,
  });
}

async function poll() {
  try {
    const data = await callTg("getUpdates", {
      offset: lastUpdateId + 1,
      timeout: 30,
    });

    if (data.ok && data.result?.length > 0) {
      for (const update of data.result) {
        lastUpdateId = update.update_id;
        await handleUpdate(update);
      }
    }
  } catch (err) {
    console.error("Polling error:", err);
  }

  poll();
}

console.log("Telegram bot started (long polling)...");
poll();
