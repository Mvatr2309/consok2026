"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import s from "./expert.module.css";

type Booking = {
  id: number;
  name: string;
  email: string;
  createdAt: string;
};

type Slot = {
  id: number;
  dateTime: string;
  maxParticipants: number;
  programName: string;
  bookings: Booking[];
};

type ExpertData = {
  id: number;
  name: string;
  photo: string;
  meetingLink: string;
  total: number;
  page: number;
  totalPages: number;
  slots: Slot[];
};

type Tab = "upcoming" | "archive";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU", {
    weekday: "short",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Moscow",
  });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Moscow",
  });
}

export default function ExpertCabinetClient({ token }: { token: string }) {
  const [data, setData] = useState<ExpertData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("upcoming");
  const [page, setPage] = useState(1);
  const router = useRouter();

  const loadData = useCallback(() => {
    setLoading(true);
    fetch(`/api/expert?token=${encodeURIComponent(token)}&tab=${tab}&page=${page}`)
      .then((res) => res.json())
      .then((result) => {
        if (result.error) {
          setError(result.error);
        } else {
          setData(result);
        }
      })
      .catch(() => setError("Ошибка загрузки"))
      .finally(() => setLoading(false));
  }, [token, tab, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleLogout() {
    await fetch("/api/expert/logout", { method: "POST" });
    router.refresh();
  }

  function switchTab(newTab: Tab) {
    setTab(newTab);
    setPage(1);
  }

  if (error && !data) {
    return (
      <div className={s.denied}>
        <h1 className={s.deniedTitle}>Ошибка</h1>
        <p className={s.deniedText}>{error}</p>
      </div>
    );
  }

  if (!data && loading) return <p className={s.loading}>Загрузка...</p>;
  if (!data) return null;

  return (
    <>
      <div className={s.header}>
        <img src={data.photo} alt={data.name} className={s.photo} />
        <div>
          <p className={s.subtitle}>Личный кабинет эксперта</p>
          <h1 className={s.title}>{data.name}</h1>
        </div>
        <button className={s.logoutBtn} onClick={handleLogout}>Выйти</button>
      </div>

      {data.meetingLink && (
        <div className={s.meetingBlock}>
          <span className={s.meetingLabel}>Ссылка на встречу:</span>
          <a
            href={data.meetingLink}
            target="_blank"
            rel="noopener noreferrer"
            className={s.meetingLink}
          >
            {data.meetingLink}
          </a>
        </div>
      )}

      <div className={s.cabinetTabs}>
        <button
          className={`${s.cabinetTab} ${tab === "upcoming" ? s.cabinetTabActive : ""}`}
          onClick={() => switchTab("upcoming")}
        >
          Предстоящие ({tab === "upcoming" ? data.total : "..."})
        </button>
        <button
          className={`${s.cabinetTab} ${tab === "archive" ? s.cabinetTabActive : ""}`}
          onClick={() => switchTab("archive")}
        >
          Архив ({tab === "archive" ? data.total : "..."})
        </button>
      </div>

      {loading ? (
        <p className={s.loading}>Загрузка...</p>
      ) : data.slots.length === 0 ? (
        <p className={s.empty}>
          {tab === "upcoming" ? "Нет предстоящих консультаций" : "Архив пуст"}
        </p>
      ) : (
        <>
          <div className={s.slotsList}>
            {data.slots.map((slot) => (
              <div key={slot.id} className={s.slotCard}>
                <div className={s.slotHeader}>
                  <div>
                    <span className={s.slotDate}>{fmtDate(slot.dateTime)}</span>
                    <span className={s.slotTime}>{fmtTime(slot.dateTime)} (МСК)</span>
                  </div>
                  <div className={s.slotMeta}>
                    <span className={s.slotProgram}>{slot.programName}</span>
                    <span className={s.slotCount}>
                      {slot.bookings.length} / {slot.maxParticipants} записей
                    </span>
                  </div>
                </div>

                {slot.bookings.length > 0 ? (
                  <table className={s.bookingsTable}>
                    <thead>
                      <tr>
                        <th>Имя</th>
                        <th>Email</th>
                        <th>Дата записи</th>
                      </tr>
                    </thead>
                    <tbody>
                      {slot.bookings.map((b) => (
                        <tr key={b.id}>
                          <td>{b.name}</td>
                          <td>
                            <a href={`mailto:${b.email}`} className={s.emailLink}>
                              {b.email}
                            </a>
                          </td>
                          <td>{fmtDate(b.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className={s.noBookings}>Пока никто не записался</p>
                )}
              </div>
            ))}
          </div>

          {data.totalPages > 1 && (
            <div className={s.pagination}>
              <button
                className={s.pageBtn}
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Назад
              </button>
              <span className={s.pageInfo}>
                {page} / {data.totalPages}
              </span>
              <button
                className={s.pageBtn}
                disabled={page >= data.totalPages}
                onClick={() => setPage(page + 1)}
              >
                Далее
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}
