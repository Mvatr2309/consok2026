import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { sendReminder } from "../src/lib/mail";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

async function sendTelegramMessage(chatId: string, text: string) {
  if (!BOT_TOKEN) return;
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

async function main() {
  // Get reminder settings
  const enabledSetting = await prisma.settings.findUnique({ where: { key: "reminder_enabled" } });
  if (enabledSetting?.value !== "true") {
    console.log("Reminders disabled");
    return;
  }

  const minutesSetting = await prisma.settings.findUnique({ where: { key: "reminder_minutes_before" } });
  const minutesBefore = parseInt(minutesSetting?.value || "60");

  const now = new Date();
  const reminderWindow = new Date(now.getTime() + minutesBefore * 60 * 1000);

  // Find bookings for slots happening within the reminder window that haven't been reminded
  const bookings = await prisma.booking.findMany({
    where: {
      reminderSentAt: null,
      slot: {
        dateTime: {
          gt: now,
          lte: reminderWindow,
        },
      },
    },
    include: {
      slot: {
        include: {
          expert: true,
          product: true,
        },
      },
      telegramSub: true,
    },
  });

  console.log(`Found ${bookings.length} bookings to remind`);

  for (const booking of bookings) {
    try {
      await sendReminder({
        to: booking.email,
        userName: booking.name,
        expertName: booking.slot.expert.name,
        programName: booking.slot.product.name,
        dateTime: booking.slot.dateTime,
        meetingLink: booking.slot.expert.meetingLink,
      });

      await prisma.booking.update({
        where: { id: booking.id },
        data: { reminderSentAt: new Date() },
      });

      // Send Telegram reminder if subscribed
      if (booking.telegramSub) {
        const dt = booking.slot.dateTime.toLocaleString("ru-RU", {
          weekday: "short", day: "numeric", month: "long",
          hour: "2-digit", minute: "2-digit", timeZone: "Europe/Moscow",
        });
        await sendTelegramMessage(
          booking.telegramSub.chatId,
          `⏰ Напоминание!\n\nВаша консультация скоро начнётся:\n\n📋 ${booking.slot.product.name}\n👤 Эксперт: ${booking.slot.expert.name}\n🕐 ${dt} (МСК)\n\n🔗 Ссылка: ${booking.slot.expert.meetingLink}`
        );
        console.log(`Telegram reminder sent to chat ${booking.telegramSub.chatId}`);
      }

      console.log(`Reminder sent to ${booking.email} for slot ${booking.slot.id}`);
    } catch (err) {
      console.error(`Failed to send reminder to ${booking.email}:`, err);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
