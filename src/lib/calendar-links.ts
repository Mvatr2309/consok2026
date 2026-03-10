function formatGoogleDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function googleCalendarUrl({
  title,
  description,
  location,
  start,
  durationMinutes = 60,
}: {
  title: string;
  description: string;
  location?: string;
  start: Date;
  durationMinutes?: number;
}): string {
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${formatGoogleDate(start)}/${formatGoogleDate(end)}`,
    details: description,
    ...(location ? { location } : {}),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function yandexCalendarUrl({
  title,
  description,
  start,
  durationMinutes = 60,
}: {
  title: string;
  description: string;
  start: Date;
  durationMinutes?: number;
}): string {
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, "");
  const params = new URLSearchParams({
    startTs: fmt(start),
    endTs: fmt(end),
    name: title,
    description,
  });
  return `https://calendar.yandex.ru/week?sidebar=addEvent&${params.toString()}`;
}
