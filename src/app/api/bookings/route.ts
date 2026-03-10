import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendBookingConfirmation } from "@/lib/mail";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { slotId, name, email, programId } = body;

    if (!slotId || !name?.trim() || !email?.trim() || !programId) {
      return NextResponse.json(
        { error: "Все поля обязательны" },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Некорректный email" },
        { status: 400 }
      );
    }

    // Check if email already booked for this program
    const existingBooking = await prisma.booking.findFirst({
      where: {
        email: email.trim().toLowerCase(),
        slot: { productId: programId },
      },
    });

    if (existingBooking) {
      return NextResponse.json(
        { error: "Вы уже записаны на эту программу" },
        { status: 409 }
      );
    }

    // Get slot with expert info
    const slot = await prisma.slot.findUnique({
      where: { id: slotId },
      include: {
        expert: true,
        _count: { select: { bookings: true } },
      },
    });

    if (!slot) {
      return NextResponse.json(
        { error: "Слот не найден" },
        { status: 404 }
      );
    }

    if (slot._count.bookings >= slot.maxParticipants) {
      return NextResponse.json(
        { error: "Все места заняты" },
        { status: 409 }
      );
    }

    // Create booking
    await prisma.booking.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        slotId: slot.id,
      },
    });

    const programName = body.programName || "Консультация";

    // Check if registration email is enabled
    const emailSetting = await prisma.settings.findUnique({
      where: { key: "registration_email_enabled" },
    });
    const emailEnabled = emailSetting?.value !== "false";

    if (emailEnabled) {
      sendBookingConfirmation({
        to: email.trim().toLowerCase(),
        userName: name.trim(),
        expertName: slot.expert.name,
        programName,
        dateTime: slot.dateTime,
        meetingLink: slot.expert.meetingLink,
      }).catch((err) => console.error("Email send error:", err));
    }

    return NextResponse.json({
      meetingLink: slot.expert.meetingLink,
      expertName: slot.expert.name,
      dateTime: slot.dateTime.toISOString(),
      programName,
    });
  } catch (error) {
    console.error("Booking error:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}
