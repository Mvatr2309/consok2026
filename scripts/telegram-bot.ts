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

function googleCalendarUrl(programName: string, expertName: string, meetingLink: string, dt: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  const fmt = (d: Date) =>
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
  const end = new Date(dt.getTime() + 60 * 60 * 1000);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `Консультация: ${programName}`,
    dates: `${fmt(dt)}/${fmt(end)}`,
    details: `Эксперт: ${expertName}\nСсылка: ${meetingLink}`,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

const SITE_URL = "https://miptconsultations.icust.online";

async function handleUpdate(update: { update_id: number; message?: { chat: { id: number }; text?: string } }) {
  if (!update.message?.text) return;

  const chatId = update.message.chat.id;
  const text = update.message.text;

  // Only handle /start with deep link — ignore everything else
  if (!text.startsWith("/start")) return;

  const parts = text.split(" ");

  if (parts.length < 2 || !parts[1].startsWith("booking_")) {
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

  if (booking.slot.dateTime < new Date()) {
    await callTg("sendMessage", { chat_id: chatId, text: "Эта консультация уже прошла." });
    return;
  }

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

  const dt = booking.slot.dateTime;
  const expert = booking.slot.expert;
  const product = booking.slot.product;

  const googleUrl = googleCalendarUrl(product.name, expert.name, expert.meetingLink, dt);
  const icsUrl = `${SITE_URL}/api/bookings/${bookingId}/ics`;

  await callTg("sendMessage", {
    chat_id: chatId,
    text: `Готово! ✅ Я напомню вам о консультации.\n\n📋 Программа: ${product.name}\n👤 Эксперт: ${expert.name}\n🕐 ${formatDateTime(dt)} (МСК)\n\n🔗 Ссылка на встречу:\n${expert.meetingLink}\n\nНапоминание придёт за 1 час до встречи.`,
    reply_markup: {
      inline_keyboard: [
        [{ text: "🔗 Перейти на встречу", url: expert.meetingLink }],
        [
          { text: "📅 Google Календарь", url: googleUrl },
          { text: "📅 Скачать .ics", url: icsUrl },
        ],
      ],
    },
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
