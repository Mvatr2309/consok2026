"use client";

import { useState, useEffect, useCallback } from "react";
import s from "./admin.module.css";

type Program = { id: number; name: string; description: string; experts: { id: number; name: string }[] };
type Expert = { id: number; name: string; photo: string; description: string; meetingLink: string; accessToken: string; login: string | null; products: { id: number; name: string }[] };
type Slot = { id: number; dateTime: string; maxParticipants: number; product: { id: number; name: string }; expert: { id: number; name: string; meetingLink: string }; _count: { bookings: number } };
type Booking = { id: number; name: string; email: string; createdAt: string; slot: { dateTime: string; product: { name: string }; expert: { name: string } } };

type ConsentLog = { id: number; bookingId: number; personalData: boolean; meetingRecording: boolean; cookiePolicy: boolean; ip: string; userAgent: string; createdAt: string; booking: { name: string; email: string } };
type Tab = "programs" | "experts" | "slots" | "bookings" | "consents" | "notifications";

async function api(path: string, options?: RequestInit) {
  const res = await fetch(`/api/admin/${path}`, options);
  return res.json();
}

async function apiJson(path: string, method: string, body: unknown) {
  return api(path, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Moscow" });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Moscow" });
}

function fmtDateTime(iso: string) {
  return `${fmtDate(iso)} ${fmtTime(iso)}`;
}

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

function downloadTemplate(experts: Expert[], programs: Program[]) {
  const header = "Эксперт;Программа;Дата и время (ГГГГ-ММ-ДД ЧЧ:ММ);Макс. участников";
  const exampleRows = [
    `${experts[0]?.name || "ФИО эксперта"};${programs[0]?.name || "Название программы"};2026-03-20 10:00;5`,
    `${experts[0]?.name || "ФИО эксперта"};${programs[0]?.name || "Название программы"};2026-03-22 14:00;5`,
  ];
  const comment = [
    "",
    "# Инструкция:",
    "# - Разделитель: точка с запятой (;)",
    `# - Доступные эксперты: ${experts.map((e) => e.name).join(", ")}`,
    `# - Доступные программы: ${programs.map((p) => p.name).join(", ")}`,
    "# - Формат даты: ГГГГ-ММ-ДД ЧЧ:ММ (по московскому времени)",
    "# - Строки начинающиеся с # игнорируются",
  ];
  const csv = [header, ...exampleRows, ...comment].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "slots-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

async function handleCsvImport(file: File, reload: () => void) {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/admin/slots/import", { method: "POST", body: fd });
  const data = await res.json();
  if (data.error) {
    alert(`Ошибка: ${data.error}`);
    return;
  }
  let msg = `Создано слотов: ${data.created}`;
  if (data.errors?.length) {
    msg += `\n\nОшибки:\n${data.errors.join("\n")}`;
  }
  alert(msg);
  reload();
}

export default function AdminClient() {
  const [tab, setTab] = useState<Tab>("programs");
  const [programs, setPrograms] = useState<Program[]>([]);
  const [experts, setExperts] = useState<Expert[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [modal, setModal] = useState<{ type: string; data?: Record<string, unknown> } | null>(null);
  const [selectedSlots, setSelectedSlots] = useState<Set<number>>(new Set());
  const [slotsView, setSlotsView] = useState<"table" | "calendar">("table");
  const [calendarExpert, setCalendarExpert] = useState<number | 0>(0);
  const [calendarWeekStart, setCalendarWeekStart] = useState<Date>(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - d.getDay() + 1);
    return d;
  });
  const [bookingsPage, setBookingsPage] = useState(0);

  const load = useCallback(async () => {
    if (tab === "programs") setPrograms(await api("programs"));
    if (tab === "experts") {
      setExperts(await api("experts"));
      if (!programs.length) setPrograms(await api("programs"));
    }
    if (tab === "slots") {
      setSlots(await api("slots"));
      if (!programs.length) setPrograms(await api("programs"));
      if (!experts.length) setExperts(await api("experts"));
    }
    if (tab === "bookings") setBookings(await api("bookings"));
  }, [tab, programs.length, experts.length]);

  useEffect(() => { load(); }, [load]);

  function openModal(type: string, data?: Record<string, unknown>) {
    setModal({ type, data });
  }

  async function handleDelete(path: string, id: number) {
    if (!confirm("Удалить?")) return;
    await apiJson(path, "DELETE", { id });
    load();
  }

  return (
    <>
      <h1 className={s.title}>Админ-панель</h1>
      <div className={s.tabs}>
        {(["programs", "experts", "slots", "bookings", "consents", "notifications"] as Tab[]).map((t) => (
          <button key={t} className={`${s.tab} ${tab === t ? s.tabActive : ""}`} onClick={() => setTab(t)}>
            {{ programs: "Программы", experts: "Эксперты", slots: "Слоты", bookings: "Записи", consents: "Согласия", notifications: "Уведомления" }[t]}
          </button>
        ))}
      </div>

      {tab === "programs" && (
        <div className={s.section}>
          <div className={s.sectionHeader}>
            <h2 className={s.sectionTitle}>Программы</h2>
            <button className={`${s.btn} ${s.btnPrimary}`} onClick={() => openModal("program")}>+ Добавить</button>
          </div>
          <table className={s.table}>
            <thead><tr><th>ID</th><th>Название</th><th>Описание</th><th>Эксперты</th><th>Ссылка для абитуриентов</th><th>Действия</th></tr></thead>
            <tbody>
              {programs.map((p) => {
                const link = `${window.location.origin}/programs/${p.id}`;
                return (
                  <tr key={p.id}>
                    <td>{p.id}</td>
                    <td><strong>{p.name}</strong></td>
                    <td>{p.description.slice(0, 80)}{p.description.length > 80 ? "..." : ""}</td>
                    <td>{p.experts.map((e) => <span key={e.id} className={s.badge}>{e.name.split(" ")[0]}</span>)}</td>
                    <td>
                      <div className={s.linkCell}>
                        <a href={link} target="_blank" rel="noopener noreferrer" className={s.linkText}>{link}</a>
                        <button className={`${s.btn} ${s.btnSmall}`} style={{ background: "#eee", whiteSpace: "nowrap" }} onClick={() => { navigator.clipboard.writeText(link); }}>Копировать</button>
                      </div>
                    </td>
                    <td>
                      <div className={s.btnGroup}>
                        <button className={`${s.btn} ${s.btnPrimary} ${s.btnSmall}`} onClick={() => openModal("program", { ...p, expertIds: p.experts.map((e) => e.id) })}>Ред.</button>
                        <button className={`${s.btn} ${s.btnDanger} ${s.btnSmall}`} onClick={() => handleDelete("programs", p.id)}>Уд.</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!programs.length && <p className={s.empty}>Нет программ</p>}
        </div>
      )}

      {tab === "experts" && (
        <div className={s.section}>
          <div className={s.sectionHeader}>
            <h2 className={s.sectionTitle}>Эксперты</h2>
            <button className={`${s.btn} ${s.btnPrimary}`} onClick={() => openModal("expert")}>+ Добавить</button>
          </div>
          <table className={s.table}>
            <thead><tr><th>Фото</th><th>Имя</th><th>Описание</th><th>Ссылка на встречу</th><th>Программы</th><th>Логин</th><th>Кабинет эксперта</th><th>Действия</th></tr></thead>
            <tbody>
              {experts.map((e) => {
                const cabinetLink = `${window.location.origin}/expert?token=${e.accessToken}`;
                return (
                  <tr key={e.id}>
                    <td><img src={e.photo} alt={e.name} className={s.photo} /></td>
                    <td><strong>{e.name}</strong></td>
                    <td>{e.description.slice(0, 80)}{e.description.length > 80 ? "..." : ""}</td>
                    <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.meetingLink || "—"}</td>
                    <td>{e.products.map((p) => <span key={p.id} className={s.badge}>{p.name}</span>)}</td>
                    <td>{e.login || <span style={{ color: "#999" }}>—</span>}</td>
                    <td>
                      <div className={s.linkCell}>
                        <span className={s.linkText} style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "inline-block" }} title={cabinetLink}>{cabinetLink}</span>
                        <button className={`${s.btn} ${s.btnSmall}`} style={{ background: "#eee", whiteSpace: "nowrap" }} onClick={() => { navigator.clipboard.writeText(cabinetLink); }}>Копировать</button>
                      </div>
                    </td>
                    <td>
                      <div className={s.btnGroup}>
                        <button className={`${s.btn} ${s.btnPrimary} ${s.btnSmall}`} onClick={() => openModal("expert", { ...e, productIds: e.products.map((p) => p.id) })}>Ред.</button>
                        <button className={`${s.btn} ${s.btnDanger} ${s.btnSmall}`} onClick={() => handleDelete("experts", e.id)}>Уд.</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!experts.length && <p className={s.empty}>Нет экспертов</p>}
        </div>
      )}

      {tab === "slots" && (
        <div className={s.section}>
          <div className={s.sectionHeader}>
            <h2 className={s.sectionTitle}>Слоты</h2>
            <div className={s.btnGroup}>
              <button className={s.btn} style={{ background: slotsView === "table" ? "var(--color-primary)" : "#eee", color: slotsView === "table" ? "#fff" : undefined }} onClick={() => setSlotsView("table")}>Таблица</button>
              <button className={s.btn} style={{ background: slotsView === "calendar" ? "var(--color-primary)" : "#eee", color: slotsView === "calendar" ? "#fff" : undefined }} onClick={() => setSlotsView("calendar")}>Календарь</button>
              {slotsView === "table" && selectedSlots.size > 0 && (
                <button className={`${s.btn} ${s.btnDanger}`} onClick={async () => {
                  if (!confirm(`Удалить ${selectedSlots.size} слотов (и все связанные записи)?`)) return;
                  await api("slots", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: Array.from(selectedSlots) }) });
                  setSelectedSlots(new Set());
                  load();
                }}>Удалить выбранные ({selectedSlots.size})</button>
              )}
              <button className={`${s.btn} ${s.btnPrimary}`} onClick={() => openModal("slot")}>+ Добавить</button>
              <button className={s.btn} style={{ background: "#eee" }} onClick={() => downloadTemplate(experts, programs)}>Скачать шаблон CSV</button>
              <label className={`${s.btn}`} style={{ background: "#eee", cursor: "pointer" }}>
                Загрузить CSV
                <input type="file" accept=".csv" style={{ display: "none" }} onChange={(e) => {
                  if (e.target.files?.[0]) handleCsvImport(e.target.files[0], load);
                  e.target.value = "";
                }} />
              </label>
            </div>
          </div>

          {slotsView === "table" && (
            <>
              <table className={s.table}>
                <thead><tr>
                  <th><input type="checkbox" checked={slots.length > 0 && selectedSlots.size === slots.length} onChange={(e) => {
                    if (e.target.checked) setSelectedSlots(new Set(slots.map((sl) => sl.id)));
                    else setSelectedSlots(new Set());
                  }} /></th>
                  <th>ID</th><th>Дата/время</th><th>Программа</th><th>Эксперт</th><th>Мест</th><th>Ссылка</th><th>Действия</th>
                </tr></thead>
                <tbody>
                  {slots.map((sl) => (
                    <tr key={sl.id} style={selectedSlots.has(sl.id) ? { background: "rgba(0, 48, 146, 0.04)" } : undefined}>
                      <td><input type="checkbox" checked={selectedSlots.has(sl.id)} onChange={(e) => {
                        const next = new Set(selectedSlots);
                        if (e.target.checked) next.add(sl.id); else next.delete(sl.id);
                        setSelectedSlots(next);
                      }} /></td>
                      <td>{sl.id}</td>
                      <td>{fmtDateTime(sl.dateTime)}</td>
                      <td>{sl.product.name}</td>
                      <td>{sl.expert.name}</td>
                      <td>{sl._count.bookings}/{sl.maxParticipants}</td>
                      <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sl.expert.meetingLink}</td>
                      <td>
                        <div className={s.btnGroup}>
                          <button className={`${s.btn} ${s.btnPrimary} ${s.btnSmall}`} onClick={() => openModal("slot", { ...sl, productId: sl.product.id, expertId: sl.expert.id })}>Ред.</button>
                          <button className={`${s.btn} ${s.btnDanger} ${s.btnSmall}`} onClick={() => handleDelete("slots", sl.id)}>Уд.</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!slots.length && <p className={s.empty}>Нет слотов</p>}
            </>
          )}

          {slotsView === "calendar" && (
            <SlotsCalendar
              slots={slots}
              experts={experts}
              calendarExpert={calendarExpert}
              setCalendarExpert={setCalendarExpert}
              calendarWeekStart={calendarWeekStart}
              setCalendarWeekStart={setCalendarWeekStart}
              onEdit={(sl) => openModal("slot", { ...sl, productId: sl.product.id, expertId: sl.expert.id })}
              onDelete={(id) => handleDelete("slots", id)}
            />
          )}
        </div>
      )}

      {tab === "bookings" && (() => {
        const perPage = 10;
        const totalPages = Math.ceil(bookings.length / perPage);
        const page = Math.min(bookingsPage, Math.max(totalPages - 1, 0));
        const paged = bookings.slice(page * perPage, (page + 1) * perPage);
        return (
          <div className={s.section}>
            <div className={s.sectionHeader}>
              <h2 className={s.sectionTitle}>Записи ({bookings.length})</h2>
            </div>
            <table className={s.table}>
              <thead><tr><th>ID</th><th>Имя</th><th>Email</th><th>Программа</th><th>Эксперт</th><th>Дата слота</th><th>Записан</th><th></th></tr></thead>
              <tbody>
                {paged.map((b) => (
                  <tr key={b.id}>
                    <td>{b.id}</td>
                    <td><strong>{b.name}</strong></td>
                    <td>{b.email}</td>
                    <td>{b.slot.product.name}</td>
                    <td>{b.slot.expert.name}</td>
                    <td>{fmtDateTime(b.slot.dateTime)}</td>
                    <td>{fmtDateTime(b.createdAt)}</td>
                    <td>
                      <button className={`${s.btn} ${s.btnDanger} ${s.btnSmall}`} onClick={() => handleDelete("bookings", b.id)}>Уд.</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!bookings.length && <p className={s.empty}>Нет записей</p>}
            {totalPages > 1 && (
              <div className={s.pagination}>
                <button className={s.pageBtn} disabled={page === 0} onClick={() => setBookingsPage(page - 1)}>← Назад</button>
                {Array.from({ length: totalPages }, (_, i) => (
                  <button key={i} className={`${s.pageBtn} ${i === page ? s.pageBtnActive : ""}`} onClick={() => setBookingsPage(i)}>{i + 1}</button>
                ))}
                <button className={s.pageBtn} disabled={page >= totalPages - 1} onClick={() => setBookingsPage(page + 1)}>Вперёд →</button>
              </div>
            )}
          </div>
        );
      })()}

      {tab === "consents" && <ConsentsTab />}

      {tab === "notifications" && <NotificationsTab />}

      {modal && (
        <ModalForm
          type={modal.type}
          data={modal.data}
          programs={programs}
          experts={experts}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); load(); }}
        />
      )}
    </>
  );
}

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

function getWeekDays(start: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function fmtDayMonth(d: Date) {
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short", timeZone: "Europe/Moscow" });
}

function SlotsCalendar({ slots, experts, calendarExpert, setCalendarExpert, calendarWeekStart, setCalendarWeekStart, onEdit, onDelete }: {
  slots: Slot[];
  experts: Expert[];
  calendarExpert: number;
  setCalendarExpert: (id: number) => void;
  calendarWeekStart: Date;
  setCalendarWeekStart: (d: Date) => void;
  onEdit: (sl: Slot) => void;
  onDelete: (id: number) => void;
}) {
  const filtered = calendarExpert ? slots.filter((sl) => sl.expert.id === calendarExpert) : slots;
  const weekDays = getWeekDays(calendarWeekStart);

  const hours: number[] = [];
  for (let h = 6; h <= 22; h++) hours.push(h);

  function prevWeek() {
    const d = new Date(calendarWeekStart);
    d.setDate(d.getDate() - 7);
    setCalendarWeekStart(d);
  }

  function nextWeek() {
    const d = new Date(calendarWeekStart);
    d.setDate(d.getDate() + 7);
    setCalendarWeekStart(d);
  }

  function toThisWeek() {
    const d = new Date(); d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - d.getDay() + 1);
    setCalendarWeekStart(d);
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <select className={s.select} style={{ width: "auto", minWidth: 200 }} value={calendarExpert} onChange={(e) => setCalendarExpert(parseInt(e.target.value))}>
          <option value={0}>Все эксперты</option>
          {experts.map((exp) => <option key={exp.id} value={exp.id}>{exp.name}</option>)}
        </select>
        <div className={s.btnGroup}>
          <button className={s.btn} style={{ background: "#eee" }} onClick={prevWeek}>&larr;</button>
          <button className={s.btn} style={{ background: "#eee" }} onClick={toThisWeek}>Сегодня</button>
          <button className={s.btn} style={{ background: "#eee" }} onClick={nextWeek}>&rarr;</button>
        </div>
        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-primary-dark)" }}>
          {fmtDayMonth(weekDays[0])} — {fmtDayMonth(weekDays[6])}
        </span>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table className={s.table} style={{ minWidth: 800, tableLayout: "fixed" }}>
          <thead>
            <tr>
              <th style={{ width: 60 }}>Время</th>
              {weekDays.map((d, i) => {
                const isToday = isSameDay(d, new Date());
                return (
                  <th key={i} style={isToday ? { background: "rgba(0, 48, 146, 0.08)", color: "var(--color-primary)" } : undefined}>
                    {WEEKDAYS[i]}, {fmtDayMonth(d)}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {hours.map((h) => (
              <tr key={h}>
                <td style={{ fontSize: 12, color: "var(--color-text-muted)", textAlign: "center", padding: "4px 8px", verticalAlign: "top" }}>
                  {h.toString().padStart(2, "0")}:00
                </td>
                {weekDays.map((day, di) => {
                  const cellSlots = filtered.filter((sl) => {
                    const slDate = new Date(sl.dateTime);
                    const mskOffset = 3 * 60 * 60 * 1000;
                    const mskDate = new Date(slDate.getTime() + mskOffset);
                    return isSameDay(new Date(mskDate.getUTCFullYear(), mskDate.getUTCMonth(), mskDate.getUTCDate()), day) && mskDate.getUTCHours() === h;
                  });
                  return (
                    <td key={di} style={{ padding: 2, verticalAlign: "top", height: 50 }}>
                      {cellSlots.map((sl) => (
                        <div
                          key={sl.id}
                          onClick={() => onEdit(sl)}
                          style={{
                            background: sl._count.bookings >= sl.maxParticipants ? "rgba(232, 55, 90, 0.1)" : "rgba(0, 48, 146, 0.08)",
                            border: "1px solid " + (sl._count.bookings >= sl.maxParticipants ? "var(--color-accent)" : "var(--color-primary)"),
                            padding: "3px 6px",
                            marginBottom: 2,
                            cursor: "pointer",
                            fontSize: 11,
                            lineHeight: 1.3,
                          }}
                          title={`${sl.product.name}\n${sl.expert.name}\n${sl._count.bookings}/${sl.maxParticipants} записей\nНажмите для редактирования`}
                        >
                          <div style={{ fontWeight: 600, color: "var(--color-primary-dark)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {fmtTime(sl.dateTime)} {!calendarExpert && sl.expert.name.split(" ")[0]}
                          </div>
                          <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "var(--color-text-secondary)" }}>
                            {sl.product.name}
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ color: sl._count.bookings >= sl.maxParticipants ? "var(--color-accent)" : "var(--color-text-muted)" }}>
                              {sl._count.bookings}/{sl.maxParticipants}
                            </span>
                            <span
                              onClick={(e) => { e.stopPropagation(); onDelete(sl.id); }}
                              style={{ color: "var(--color-accent)", cursor: "pointer", fontWeight: 700 }}
                              title="Удалить"
                            >
                              &times;
                            </span>
                          </div>
                        </div>
                      ))}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ModalForm({ type, data, programs, experts, onClose, onSave }: {
  type: string;
  data?: Record<string, unknown>;
  programs: Program[];
  experts: Expert[];
  onClose: () => void;
  onSave: () => void;
}) {
  const isEdit = !!data?.id;
  const [form, setForm] = useState<Record<string, unknown>>(data || {});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function set(key: string, value: unknown) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleArray(key: string, id: number) {
    const arr = (form[key] as number[]) || [];
    set(key, arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);
  }

  async function handleUpload(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
    const { path } = await res.json();
    set("photo", path);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const method = isEdit ? "PUT" : "POST";
      const result = await apiJson(
        type === "program" ? "programs" : type === "expert" ? "experts" : "slots",
        method,
        form
      );
      if (result.error) { setError(result.error); return; }
      onSave();
    } catch { setError("Ошибка"); } finally { setLoading(false); }
  }

  return (
    <div className={s.modal} onClick={onClose}>
      <form className={s.modalContent} onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h3 className={s.modalTitle}>{isEdit ? "Редактировать" : "Добавить"} {
          { program: "программу", expert: "эксперта", slot: "слот" }[type]
        }</h3>
        {error && <p className={s.error}>{error}</p>}

        {type === "program" && (
          <>
            <div className={s.formGroup}>
              <label className={s.label}>Название</label>
              <input className={s.input} value={(form.name as string) || ""} onChange={(e) => set("name", e.target.value)} required />
            </div>
            <div className={s.formGroup}>
              <label className={s.label}>Описание</label>
              <textarea className={s.textarea} value={(form.description as string) || ""} onChange={(e) => set("description", e.target.value)} />
            </div>
            <div className={s.formGroup}>
              <label className={s.label}>Эксперты</label>
              <div className={s.checkboxGroup}>
                {experts.map((exp) => {
                  const checked = ((form.expertIds as number[]) || []).includes(exp.id);
                  return (
                    <span key={exp.id} className={`${s.checkboxLabel} ${checked ? s.checkboxLabelChecked : ""}`} onClick={() => toggleArray("expertIds", exp.id)}>
                      {exp.name.split(" ")[0]}
                    </span>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {type === "expert" && (
          <>
            <div className={s.formGroup}>
              <label className={s.label}>ФИО</label>
              <input className={s.input} value={(form.name as string) || ""} onChange={(e) => set("name", e.target.value)} required />
            </div>
            <div className={s.formGroup}>
              <label className={s.label}>Описание</label>
              <textarea className={s.textarea} value={(form.description as string) || ""} onChange={(e) => set("description", e.target.value)} />
            </div>
            <div className={s.formGroup}>
              <label className={s.label}>Ссылка на встречу</label>
              <input className={s.input} value={(form.meetingLink as string) || ""} onChange={(e) => set("meetingLink", e.target.value)} placeholder="https://meet.google.com/..." />
            </div>
            <div className={s.formGroup}>
              <label className={s.label}>Фото</label>
              <input type="file" accept="image/*" className={s.fileInput} onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
              {typeof form.photo === "string" && form.photo && <img src={form.photo} alt="" className={s.photoPreview} />}
            </div>
            <div className={s.formGroup}>
              <label className={s.label}>Программы</label>
              <div className={s.checkboxGroup}>
                {programs.map((p) => {
                  const checked = ((form.productIds as number[]) || []).includes(p.id);
                  return (
                    <span key={p.id} className={`${s.checkboxLabel} ${checked ? s.checkboxLabelChecked : ""}`} onClick={() => toggleArray("productIds", p.id)}>
                      {p.name}
                    </span>
                  );
                })}
              </div>
            </div>
            <div style={{ borderTop: "1px solid #e8ecf4", margin: "16px 0", paddingTop: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#123194", marginBottom: 12 }}>Авторизация в кабинет</p>
              <div className={s.formGroup}>
                <label className={s.label}>Логин</label>
                <input className={s.input} value={(form.login as string) || ""} onChange={(e) => set("login", e.target.value)} placeholder="expert1" autoComplete="off" />
              </div>
              <div className={s.formGroup}>
                <label className={s.label}>{isEdit ? "Новый пароль (оставьте пустым, чтобы не менять)" : "Пароль"}</label>
                <input className={s.input} type="password" value={(form.password as string) || ""} onChange={(e) => set("password", e.target.value)} placeholder="••••••" autoComplete="new-password" />
              </div>
            </div>
          </>
        )}

        {type === "slot" && (
          <>
            <div className={s.formGroup}>
              <label className={s.label}>Программа</label>
              <select className={s.select} value={(form.productId as number) || ""} onChange={(e) => set("productId", parseInt(e.target.value))} required>
                <option value="">Выберите...</option>
                {programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className={s.formGroup}>
              <label className={s.label}>Эксперт</label>
              <select className={s.select} value={(form.expertId as number) || ""} onChange={(e) => set("expertId", parseInt(e.target.value))} required>
                <option value="">Выберите...</option>
                {experts.map((exp) => <option key={exp.id} value={exp.id}>{exp.name}</option>)}
              </select>
            </div>
            <div className={s.formGroup}>
              <label className={s.label}>Дата и время</label>
              <input type="datetime-local" className={s.input} value={form.dateTime ? toLocalInput(form.dateTime as string) : ""} onChange={(e) => set("dateTime", new Date(e.target.value).toISOString())} required />
            </div>
            <div className={s.formGroup}>
              <label className={s.label}>Макс. участников</label>
              <input type="number" min={1} className={s.input} value={(form.maxParticipants as number) || ""} onChange={(e) => set("maxParticipants", parseInt(e.target.value))} required />
            </div>
          </>
        )}

        <div className={s.modalActions}>
          <button type="submit" className={`${s.btn} ${s.btnPrimary}`} disabled={loading}>
            {loading ? "Сохраняем..." : isEdit ? "Сохранить" : "Создать"}
          </button>
          <button type="button" className={s.btn} onClick={onClose} style={{ background: "#eee" }}>Отмена</button>
        </div>
      </form>
    </div>
  );
}

function ConsentsTab() {
  const [consents, setConsents] = useState<ConsentLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("consents").then((data) => {
      if (Array.isArray(data)) setConsents(data);
      setLoading(false);
    });
  }, []);

  if (loading) return <p className={s.empty}>Загрузка...</p>;

  return (
    <div className={s.section}>
      <div className={s.sectionHeader}>
        <h2 className={s.sectionTitle}>Логи согласий</h2>
      </div>
      <table className={s.table}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Имя</th>
            <th>Email</th>
            <th>Перс. данные</th>
            <th>Запись встречи</th>
            <th>Cookie</th>
            <th>IP</th>
            <th>User Agent</th>
            <th>Дата</th>
          </tr>
        </thead>
        <tbody>
          {consents.map((c) => (
            <tr key={c.id}>
              <td>{c.id}</td>
              <td><strong>{c.booking.name}</strong></td>
              <td>{c.booking.email}</td>
              <td>{c.personalData ? "Да" : "Нет"}</td>
              <td>{c.meetingRecording ? "Да" : "Нет"}</td>
              <td>{c.cookiePolicy ? "Да" : "Нет"}</td>
              <td style={{ fontSize: 12 }}>{c.ip}</td>
              <td style={{ fontSize: 11, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.userAgent}</td>
              <td>{fmtDateTime(c.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!consents.length && <p className={s.empty}>Нет записей о согласиях</p>}
    </div>
  );
}

function NotificationsTab() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api("settings").then((data) => {
      setSettings(data);
      setLoading(false);
    });
  }, []);

  function set(key: string, value: string) {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    await apiJson("settings", "PUT", settings);
    setSaving(false);
    setSaved(true);
  }

  if (loading) return <p>Загрузка...</p>;

  return (
    <div className={s.section}>
      <h2 className={s.sectionTitle}>Настройка уведомлений</h2>

      <div style={{ background: "#fff", padding: 32, borderTop: "3px solid var(--color-primary)", maxWidth: 560, marginTop: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: "#123194", marginBottom: 20 }}>
          1. Письмо при регистрации
        </h3>
        <p style={{ fontSize: 13, color: "#555", marginBottom: 12, lineHeight: 1.6 }}>
          Отправляется сразу после записи. Содержит детали консультации и кнопки «Добавить в Google Календарь» / «Добавить в Яндекс Календарь».
        </p>
        <div className={s.formGroup}>
          <label className={s.label} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={settings.registration_email_enabled === "true"}
              onChange={(e) => set("registration_email_enabled", e.target.checked ? "true" : "false")}
            />
            Включено
          </label>
        </div>

        <div style={{ borderTop: "1px solid #e8ecf4", margin: "24px 0", paddingTop: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "#123194", marginBottom: 20 }}>
            2. Напоминание перед встречей
          </h3>
          <p style={{ fontSize: 13, color: "#555", marginBottom: 12, lineHeight: 1.6 }}>
            Отправляется за указанное время до начала консультации. Содержит ссылку на встречу и кнопку «Перейти на встречу».
          </p>
          <div className={s.formGroup}>
            <label className={s.label} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={settings.reminder_enabled === "true"}
                onChange={(e) => set("reminder_enabled", e.target.checked ? "true" : "false")}
              />
              Включено
            </label>
          </div>
          <div className={s.formGroup}>
            <label className={s.label}>Отправить за (минут до встречи)</label>
            <input
              type="number"
              min={5}
              max={1440}
              className={s.input}
              style={{ maxWidth: 200 }}
              value={settings.reminder_minutes_before || "60"}
              onChange={(e) => set("reminder_minutes_before", e.target.value)}
            />
            <p style={{ fontSize: 12, color: "#999", marginTop: 4 }}>
              Например: 60 = за 1 час, 1440 = за 24 часа
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16 }}>
          <button className={`${s.btn} ${s.btnPrimary}`} onClick={handleSave} disabled={saving}>
            {saving ? "Сохраняем..." : "Сохранить настройки"}
          </button>
          {saved && <span style={{ color: "#28a745", fontSize: 14, fontWeight: 600 }}>Сохранено!</span>}
        </div>
      </div>
    </div>
  );
}
