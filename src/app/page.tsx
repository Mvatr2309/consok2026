import Link from "next/link";
import { prisma } from "@/lib/prisma";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

function formatDate(date: Date): string {
  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    timeZone: "Europe/Moscow",
  });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Moscow",
  });
}

export default async function HomePage() {
  const programs = await prisma.product.findMany({
    include: {
      experts: true,
      slots: {
        where: {
          dateTime: { gte: new Date() },
        },
        include: {
          _count: {
            select: { bookings: true },
          },
        },
        orderBy: { dateTime: "asc" },
      },
    },
  });

  return (
    <>
      <h1 className={styles.title}>Запись на консультации</h1>
      <div className={styles.grid}>
        {programs.map((program) => {
          const availableSlots = program.slots.filter(
            (slot) => slot._count.bookings < slot.maxParticipants
          );
          const previewSlots = availableSlots.slice(0, 5);
          const remainingCount = availableSlots.length - previewSlots.length;

          return (
            <div key={program.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardInfo}>
                  <h2 className={styles.cardName}>{program.name}</h2>
                  <p className={styles.cardDesc}>{program.description}</p>
                </div>
              </div>

              <div className={styles.experts}>
                <span className={styles.expertsLabel}>Эксперты:</span>
                <div className={styles.expertPhotos}>
                  {program.experts.map((expert) => (
                    <img
                      key={expert.id}
                      src={expert.photo}
                      alt={expert.name}
                      className={styles.expertPhoto}
                    />
                  ))}
                </div>
                <span className={styles.expertName}>
                  {program.experts.map((e) => e.name.split(" ")[0]).join(", ")}
                </span>
              </div>

              {previewSlots.length > 0 ? (
                <div className={styles.slots}>
                  {previewSlots.map((slot) => (
                    <span key={slot.id} className={styles.slot}>
                      <span className={styles.slotDate}>
                        {formatDate(slot.dateTime)}
                      </span>
                      <span className={styles.slotTime}>
                        {formatTime(slot.dateTime)}
                      </span>
                    </span>
                  ))}
                  {remainingCount > 0 && (
                    <span className={styles.moreSlots}>
                      +{remainingCount} ещё
                    </span>
                  )}
                </div>
              ) : (
                <p className={styles.noSlots}>Нет доступных слотов</p>
              )}

              <Link
                href={`/programs/${program.id}`}
                className={styles.cardCta}
              >
                Записаться
              </Link>
            </div>
          );
        })}
      </div>
    </>
  );
}
