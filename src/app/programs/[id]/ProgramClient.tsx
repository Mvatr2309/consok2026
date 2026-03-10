"use client";

import { useState, useEffect } from "react";
import styles from "./page.module.css";

type SlotData = {
  id: number;
  dateTime: string;
  maxParticipants: number;
  bookedCount: number;
};

type ExpertData = {
  id: number;
  name: string;
  photo: string;
  description: string;
  slots: SlotData[];
};

type BookingResult = {
  bookingId: number;
  meetingLink: string;
  expertName: string;
  dateTime: string;
  programName: string;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", {
    weekday: "short",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Moscow",
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Moscow",
  });
}

function googleCalendarUrl(result: BookingResult): string {
  const dt = new Date(result.dateTime);
  const pad = (n: number) => n.toString().padStart(2, "0");
  const fmt = (d: Date) =>
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
  const end = new Date(dt.getTime() + 60 * 60 * 1000);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `Консультация: ${result.programName}`,
    dates: `${fmt(dt)}/${fmt(end)}`,
    details: `Эксперт: ${result.expertName}\nСсылка: ${result.meetingLink}`,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function yandexCalendarUrl(result: BookingResult): string {
  const dt = new Date(result.dateTime);
  const end = new Date(dt.getTime() + 60 * 60 * 1000);
  const pad = (n: number) => n.toString().padStart(2, "0");
  const fmtLocal = (d: Date) => {
    // Format in Moscow time for Yandex
    const msk = new Date(d.toLocaleString("en-US", { timeZone: "Europe/Moscow" }));
    return `${msk.getFullYear()}-${pad(msk.getMonth() + 1)}-${pad(msk.getDate())}T${pad(msk.getHours())}:${pad(msk.getMinutes())}:00`;
  };
  const params = new URLSearchParams({
    startDate: fmtLocal(dt),
    endDate: fmtLocal(end),
    title: `Консультация: ${result.programName}`,
    description: `Эксперт: ${result.expertName}\nСсылка: ${result.meetingLink}`,
  });
  return `https://calendar.yandex.ru/event?${params.toString()}`;
}

export default function ProgramClient({
  programId,
  programName,
  experts,
}: {
  programId: number;
  programName: string;
  experts: ExpertData[];
}) {
  const [selectedExpert, setSelectedExpert] = useState<number | null>(
    experts.length === 1 ? experts[0].id : null
  );
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<BookingResult | null>(null);
  const [consentPersonal, setConsentPersonal] = useState(false);
  const [consentRecording, setConsentRecording] = useState(false);
  const [cookieAccepted, setCookieAccepted] = useState(true);

  useEffect(() => {
    setCookieAccepted(localStorage.getItem("cookie_accepted") === "1");
  }, []);

  const currentExpert = experts.find((e) => e.id === selectedExpert);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSlot || !name.trim() || !email.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotId: selectedSlot,
          name: name.trim(),
          email: email.trim(),
          programId,
          programName,
          consentPersonal,
          consentRecording,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Произошла ошибка");
        return;
      }

      setResult(data);
    } catch {
      setError("Ошибка сети. Попробуйте ещё раз.");
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <div className={styles.success}>
        <h2 className={styles.successTitle}>Вы записаны!</h2>
        <p className={styles.successText}>
          Консультация с экспертом {result.expertName}
        </p>
        <p className={styles.successText}>
          {formatDate(result.dateTime)} в {formatTime(result.dateTime)} (МСК)
        </p>
        <p className={styles.successText}>Ссылка на встречу:</p>
        <a
          href={result.meetingLink}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.successLink}
        >
          {result.meetingLink}
        </a>
        <p className={styles.successText} style={{ marginTop: 16 }}>Добавить в календарь:</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <a
            href={googleCalendarUrl(result)}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.calendarBtn}
          >
            Google Календарь
          </a>
          <a
            href={yandexCalendarUrl(result)}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.calendarBtn}
            style={{ background: "var(--color-accent)" }}
          >
            Яндекс Календарь
          </a>
        </div>
        <p className={styles.successText} style={{ marginTop: 16 }}>Напоминание в Telegram:</p>
        <a
          href={`https://t.me/mipt_consultation_bot?start=booking_${result.bookingId}`}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.calendarBtn}
          style={{ background: "#0088cc" }}
        >
          Напомнить в Telegram
        </a>
      </div>
    );
  }

  return (
    <>
      <h3 className={styles.sectionTitle}>Выберите эксперта</h3>
      <div className={styles.expertsGrid}>
        {experts.map((expert) => (
          <div
            key={expert.id}
            className={`${styles.expertCard} ${
              selectedExpert === expert.id ? styles.expertCardActive : ""
            }`}
            onClick={() => {
              setSelectedExpert(expert.id);
              setSelectedSlot(null);
              setError("");
            }}
          >
            <img
              src={expert.photo}
              alt={expert.name}
              className={styles.expertPhoto}
            />
            <div className={styles.expertInfo}>
              <h4 className={styles.expertName}>{expert.name}</h4>
              <p className={styles.expertDesc}>{expert.description}</p>
            </div>
          </div>
        ))}
      </div>

      {currentExpert && (
        <>
          <h3 className={styles.sectionTitle}>Доступные слоты</h3>
          {currentExpert.slots.length > 0 ? (
            <>
              <p className={styles.hint}>Выберите удобное время</p>
              <div className={styles.slotsGrid}>
                {currentExpert.slots.map((slot) => {
                  const isFull = slot.bookedCount >= slot.maxParticipants;
                  const isSelected = selectedSlot === slot.id;
                  return (
                    <button
                      key={slot.id}
                      className={`${styles.slotBtn} ${
                        isSelected ? styles.slotBtnActive : ""
                      } ${isFull ? styles.slotBtnFull : ""}`}
                      disabled={isFull}
                      onClick={() => {
                        setSelectedSlot(slot.id);
                        setError("");
                      }}
                    >
                      <span className={styles.slotDate}>
                        {formatDate(slot.dateTime)}
                      </span>
                      <span className={styles.slotTime}>
                        {formatTime(slot.dateTime)}
                      </span>
                      <span className={styles.slotSeats}>
                        {isFull
                          ? "Мест нет"
                          : `${slot.maxParticipants - slot.bookedCount} из ${slot.maxParticipants} мест`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <p className={styles.noSlots}>
              Нет доступных слотов у этого эксперта
            </p>
          )}
        </>
      )}

      {!cookieAccepted && (
        <div className={styles.cookieBanner}>
          <span className={styles.cookieBannerText}>
            Этот сайт использует файлы cookie для обеспечения работы сервиса.
            Продолжая использовать сайт, вы соглашаетесь с{" "}
            <a href="https://mipt.ru/privacy" target="_blank" rel="noopener noreferrer">
              Политикой обработки файлов cookie
            </a>.
          </span>
          <button
            className={styles.cookieBannerBtn}
            onClick={() => {
              localStorage.setItem("cookie_accepted", "1");
              setCookieAccepted(true);
            }}
          >
            Принять
          </button>
        </div>
      )}

      {selectedSlot && (
        <form className={styles.form} onSubmit={handleSubmit}>
          <h3 className={styles.formTitle}>Записаться на консультацию</h3>
          {error && <p className={styles.error}>{error}</p>}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Ваше имя</label>
            <input
              type="text"
              className={styles.formInput}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Иван Иванов"
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Email</label>
            <input
              type="email"
              className={styles.formInput}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@mail.ru"
              required
            />
          </div>
          <div className={styles.consentGroup}>
            <label className={styles.consentLabel}>
              <input
                type="checkbox"
                checked={consentPersonal}
                onChange={(e) => setConsentPersonal(e.target.checked)}
              />
              <span>
                Я соглашаюсь с{" "}
                <a
                  href="https://mipt.ru/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.consentLink}
                >
                  Политикой в отношении обработки персональных данных
                </a>{" "}
                и Политикой обработки файлов cookie
              </span>
            </label>
            <label className={styles.consentLabel}>
              <input
                type="checkbox"
                checked={consentRecording}
                onChange={(e) => setConsentRecording(e.target.checked)}
              />
              <span>
                Я соглашаюсь с тем, что встреча будет записана
              </span>
            </label>
          </div>
          <button
            type="submit"
            className={styles.formSubmit}
            disabled={loading || !name.trim() || !email.trim() || !consentPersonal || !consentRecording}
          >
            {loading ? "Записываем..." : "Записаться"}
          </button>
        </form>
      )}
    </>
  );
}
