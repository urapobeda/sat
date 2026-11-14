// Asia/Almaty has been a fixed UTC+5 offset with no daylight saving since 2005.
const ALMATY_OFFSET_MINUTES = 5 * 60;

/** `date` as "YYYY-MM-DD" and `time` as "HH:mm", both Almaty wall-clock, to a UTC ISO string. */
export function almatyInputToUtcIso(date: string, time: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match || !timeMatch) return null;
  const [, year, month, day] = match;
  const [, hour, minute] = timeMatch;
  const utcMs =
    Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute)) -
    ALMATY_OFFSET_MINUTES * 60_000;
  return new Date(utcMs).toISOString();
}

/** UTC ISO string to `{ date, time }` for pre-filling Almaty wall-clock form inputs. */
export function utcIsoToAlmatyInput(iso: string): { date: string; time: string } {
  const almaty = new Date(new Date(iso).getTime() + ALMATY_OFFSET_MINUTES * 60_000);
  const date = `${almaty.getUTCFullYear()}-${String(almaty.getUTCMonth() + 1).padStart(2, "0")}-${String(almaty.getUTCDate()).padStart(2, "0")}`;
  const time = `${String(almaty.getUTCHours()).padStart(2, "0")}:${String(almaty.getUTCMinutes()).padStart(2, "0")}`;
  return { date, time };
}

export function formatAlmaty(iso: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Asia/Almaty",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(iso));
}
