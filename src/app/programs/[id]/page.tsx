import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ProgramClient from "./ProgramClient";
import styles from "./page.module.css";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ProgramPage({ params }: Props) {
  const { id } = await params;
  const programId = parseInt(id, 10);
  if (isNaN(programId)) notFound();

  const now = new Date();

  const program = await prisma.product.findUnique({
    where: { id: programId },
    include: {
      experts: {
        include: {
          slots: {
            where: {
              productId: programId,
              dateTime: { gte: now },
            },
            include: {
              _count: { select: { bookings: true } },
            },
            orderBy: { dateTime: "asc" },
          },
        },
      },
    },
  });

  if (!program) notFound();

  const expertsData = program.experts.map((expert) => ({
    id: expert.id,
    name: expert.name,
    photo: expert.photo,
    description: expert.description,
    slots: expert.slots.map((slot) => ({
      id: slot.id,
      dateTime: slot.dateTime.toISOString(),
      maxParticipants: slot.maxParticipants,
      bookedCount: slot._count.bookings,
    })),
  }));

  return (
    <>
      <p className={styles.pageSubtitle}>Запись на групповую консультацию</p>
      <h1 className={styles.programTitle}>{program.name}</h1>
      <p className={styles.programDesc}>{program.description}</p>
      <ProgramClient
        programId={program.id}
        programName={program.name}
        experts={expertsData}
      />
    </>
  );
}
