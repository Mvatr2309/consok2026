import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { sendReminder } from "../src/lib/mail";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

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

      console.log(`Reminder sent to ${booking.email} for slot ${booking.slot.id}`);
    } catch (err) {
      console.error(`Failed to send reminder to ${booking.email}:`, err);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
