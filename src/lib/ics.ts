export function generateIcs({
  summary,
  description,
  location,
  url,
  start,
  durationMinutes = 60,
}: {
  summary: string;
  description: string;
  location?: string;
  url: string;
  start: Date;
  durationMinutes?: number;
}): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  const formatDt = (d: Date) =>
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;

  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  const uid = `${Date.now()}-${Math.random().toString(36).slice(2)}@mipt-consultations`;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//MIPT//Consultations//RU",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTART:${formatDt(start)}`,
    `DTEND:${formatDt(end)}`,
    `SUMMARY:${escapeIcs(summary)}`,
    `DESCRIPTION:${escapeIcs(description)}`,
    `URL:${url}`,
    ...(location ? [`LOCATION:${escapeIcs(location)}`] : []),
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return lines.join("\r\n");
}

function escapeIcs(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}
