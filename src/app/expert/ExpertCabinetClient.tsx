"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import s from "./expert.module.css";

type Booking = {
  id: number;
  name: string;
  email: string;
  createdAt: string;
  attended: boolean;
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
type ViewMode = "list" | "calendar";

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

function fmtShortDate(d: Date) {
  return d.toLocaleDateString("ru-RU", { weekday: "short", day: "numeric", month: "short", timeZone: "Europe/Moscow" });
}

function getMskHour(iso: string) {
  const h = parseInt(new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", hour12: false, timeZone: "Europe/Moscow" }));
  return h;
}

function getMskDayOfWeek(iso: string) {
  const d = new Date(iso).toLocaleDateString("en-US", { weekday: "short", timeZone: "Europe/Moscow" });
  const map: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
  return map[d] ?? 0;
}

function getMonday(): Date {
  const now = new Date();
  const msk = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Moscow" }));
  const day = msk.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(msk);
  monday.setDate(msk.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function toDateStr(d: Date) {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const dd = d.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

/* Calendar sub-component */
function ExpertCalendar({ token, onSelectSlot }: { token: string; onSelectSlot: (slot: Slot) => void }) {
  const [weekStart, setWeekStart] = useState(getMonday);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/expert?token=${encodeURIComponent(token)}&view=calendar&weekStart=${toDateStr(weekStart)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.slots) setSlots(data.slots);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token, weekStart]);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const hours = Array.from({ length: 17 }, (_, i) => i + 6); // 6..22

  function prevWeek() {
    setWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
  }

  function nextWeek() {
    setWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
  }

  function toToday() {
    setWeekStart(getMonday());
  }

  return (
    <div>
      <div className={s.calNav}>
        <button className={s.calNavBtn} onClick={prevWeek}>&larr;</button>
        <button className={s.calNavBtn} onClick={toToday}>Сегодня</button>
        <button className={s.calNavBtn} onClick={nextWeek}>&rarr;</button>
        <span className={s.calNavLabel}>
          {fmtShortDate(days[0])} — {fmtShortDate(days[6])}
        </span>
      </div>

      {loading ? (
        <p className={s.loading}>Загрузка...</p>
      ) : (
        <div className={s.calGrid}>
          {/* Header row */}
          <div className={s.calCorner}></div>
          {days.map((d, i) => (
            <div key={i} className={s.calDayHeader}>{fmtShortDate(d)}</div>
          ))}

          {/* Hour rows */}
          {hours.map((hour) => (
            <div key={hour} className={s.calRow}>
              <div className={s.calHourLabel}>{hour}:00</div>
              {days.map((_, dayIdx) => {
                const cellSlots = slots.filter(
                  (sl) => getMskDayOfWeek(sl.dateTime) === dayIdx && getMskHour(sl.dateTime) === hour
                );
                return (
                  <div key={dayIdx} className={s.calCell}>
                    {cellSlots.map((sl) => {
                      const isFull = sl.bookings.length >= sl.maxParticipants;
                      return (
                        <div
                          key={sl.id}
                          className={`${s.calSlot} ${isFull ? s.calSlotFull : ""}`}
                          onClick={() => onSelectSlot(sl)}
                          title={`${sl.programName} — ${sl.bookings.length}/${sl.maxParticipants}`}
                        >
                          <span className={s.calSlotTime}>{fmtTime(sl.dateTime)}</span>
                          <span className={s.calSlotProgram}>{sl.programName}</span>
                          <span className={s.calSlotCount}>{sl.bookings.length}/{sl.maxParticipants}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ExpertCabinetClient({ token }: { token: string }) {
  const [data, setData] = useState<ExpertData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("upcoming");
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedCalSlot, setSelectedCalSlot] = useState<Slot | null>(null);
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

  async function toggleAttendance(bookingId: number, attended: boolean) {
    await fetch(`/api/expert/attendance?token=${encodeURIComponent(token)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId, attended }),
    });
    // Update local state
    if (data) {
      setData({
        ...data,
        slots: data.slots.map((sl) => ({
          ...sl,
          bookings: sl.bookings.map((b) =>
            b.id === bookingId ? { ...b, attended } : b
          ),
        })),
      });
    }
    if (selectedCalSlot) {
      setSelectedCalSlot({
        ...selectedCalSlot,
        bookings: selectedCalSlot.bookings.map((b) =>
          b.id === bookingId ? { ...b, attended } : b
        ),
      });
    }
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

      {/* View toggle */}
      <div className={s.viewToggle}>
        <button
          className={`${s.viewToggleBtn} ${viewMode === "list" ? s.viewToggleBtnActive : ""}`}
          onClick={() => setViewMode("list")}
        >
          Список
        </button>
        <button
          className={`${s.viewToggleBtn} ${viewMode === "calendar" ? s.viewToggleBtnActive : ""}`}
          onClick={() => setViewMode("calendar")}
        >
          Календарь
        </button>
      </div>

      {viewMode === "calendar" ? (
        <>
          <ExpertCalendar token={token} onSelectSlot={(sl) => setSelectedCalSlot(sl)} />

          {/* Slot detail modal */}
          {selectedCalSlot && (
            <div className={s.calModal} onClick={() => setSelectedCalSlot(null)}>
              <div className={s.calModalContent} onClick={(e) => e.stopPropagation()}>
                <div className={s.calModalHeader}>
                  <h3 className={s.calModalTitle}>
                    {fmtDate(selectedCalSlot.dateTime)} в {fmtTime(selectedCalSlot.dateTime)} (МСК)
                  </h3>
                  <button className={s.calModalClose} onClick={() => setSelectedCalSlot(null)}>&times;</button>
                </div>
                <div className={s.slotMeta} style={{ marginBottom: 12 }}>
                  <span className={s.slotProgram}>{selectedCalSlot.programName}</span>
                  <span className={s.slotCount}>
                    {selectedCalSlot.bookings.length} / {selectedCalSlot.maxParticipants} записей
                  </span>
                </div>
                {selectedCalSlot.bookings.length > 0 ? (
                  <table className={s.bookingsTable}>
                    <thead>
                      <tr><th>Имя</th><th>Email</th><th>Дата записи</th><th>Присутствие</th></tr>
                    </thead>
                    <tbody>
                      {selectedCalSlot.bookings.map((b) => (
                        <tr key={b.id}>
                          <td>{b.name}</td>
                          <td><a href={`mailto:${b.email}`} className={s.emailLink}>{b.email}</a></td>
                          <td>{fmtDate(b.createdAt)}</td>
                          <td style={{ textAlign: "center" }}>
                            <input
                              type="checkbox"
                              checked={b.attended}
                              onChange={(e) => toggleAttendance(b.id, e.target.checked)}
                              style={{ width: 18, height: 18, cursor: "pointer" }}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className={s.noBookings}>Пока никто не записался</p>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        <>
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
                            <th>Присутствие</th>
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
                              <td style={{ textAlign: "center" }}>
                                <input
                                  type="checkbox"
                                  checked={b.attended}
                                  onChange={(e) => toggleAttendance(b.id, e.target.checked)}
                                  style={{ width: 18, height: 18, cursor: "pointer" }}
                                />
                              </td>
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
      )}
    </>
  );
}
