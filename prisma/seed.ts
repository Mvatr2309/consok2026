import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Очистка
  await prisma.booking.deleteMany();
  await prisma.slot.deleteMany();
  await prisma.expert.deleteMany();
  await prisma.product.deleteMany();

  // Продукты
  const product1 = await prisma.product.create({
    data: {
      name: "Цифровой продукт 1",
      description: "Описание первого продукта. Платформа для автоматизации процессов.",
    },
  });
  const product2 = await prisma.product.create({
    data: {
      name: "Цифровой продукт 2",
      description: "Описание второго продукта. Сервис аналитики данных.",
    },
  });
  const product3 = await prisma.product.create({
    data: {
      name: "Цифровой продукт 3",
      description: "Описание третьего продукта. Инструмент для совместной работы.",
    },
  });

  // Эксперты
  const expert1 = await prisma.expert.create({
    data: {
      name: "Иванов Иван Иванович",
      photo: "/experts/expert1.jpg",
      description: "Эксперт по цифровой трансформации. Опыт работы — 10 лет.",
      meetingLink: "https://meet.google.com/expert1-room",
      products: { connect: [{ id: product1.id }] },
    },
  });
  const expert2 = await prisma.expert.create({
    data: {
      name: "Петрова Мария Сергеевна",
      photo: "/experts/expert2.jpg",
      description: "Специалист по аналитике данных и машинному обучению.",
      meetingLink: "https://meet.google.com/expert2-room",
      products: { connect: [{ id: product2.id }] },
    },
  });
  const expert3 = await prisma.expert.create({
    data: {
      name: "Сидоров Алексей Петрович",
      photo: "/experts/expert3.jpg",
      description: "Архитектор решений, специализация — совместная работа.",
      meetingLink: "https://meet.google.com/expert3-room",
      products: { connect: [{ id: product3.id }] },
    },
  });
  const expert4 = await prisma.expert.create({
    data: {
      name: "Козлова Елена Дмитриевна",
      photo: "/experts/expert4.jpg",
      description: "Продуктовый менеджер, эксперт по UX и интеграциям.",
      meetingLink: "https://meet.google.com/expert4-room",
      products: { connect: [{ id: product3.id }] },
    },
  });

  // Слоты (тестовые, на ближайшие дни)
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() + 1);
  baseDate.setHours(10, 0, 0, 0);

  const slots = [
    { expert: expert1, product: product1, daysOffset: 1, hour: 10 },
    { expert: expert1, product: product1, daysOffset: 3, hour: 14 },
    { expert: expert2, product: product2, daysOffset: 2, hour: 11 },
    { expert: expert2, product: product2, daysOffset: 4, hour: 16 },
    { expert: expert3, product: product3, daysOffset: 1, hour: 12 },
    { expert: expert3, product: product3, daysOffset: 5, hour: 10 },
    { expert: expert4, product: product3, daysOffset: 2, hour: 15 },
    { expert: expert4, product: product3, daysOffset: 4, hour: 11 },
  ];

  for (const s of slots) {
    const dateTime = new Date();
    dateTime.setDate(dateTime.getDate() + s.daysOffset);
    dateTime.setHours(s.hour, 0, 0, 0);

    await prisma.slot.create({
      data: {
        dateTime,
        maxParticipants: 5,
        productId: s.product.id,
        expertId: s.expert.id,
      },
    });
  }

  console.log("Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
