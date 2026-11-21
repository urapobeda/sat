// Current Almaty wall-clock dates use UTC+5 (the change took effect in 2024).
const ALMATY_OFFSET_MINUTES = 5 * 60;

/** `date` as "YYYY-MM-DD" and `time` as "HH:mm", both Almaty wall-clock, to a UTC ISO string. */
export function almatyInputToUtcIso(date: string, time: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match || !timeMatch) return null;
  const [, year, month, day] = match;
  const [, hour, minute] = timeMatch;
  if (Number(year) < 100 || Number(hour) > 23 || Number(minute) > 59) return null;
  const calendar = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (calendar.getUTCFullYear() !== Number(year) || calendar.getUTCMonth() !== Number(month) - 1 || calendar.getUTCDate() !== Number(day)) return null;
  const utcMs =
    Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute)) -
    ALMATY_OFFSET_MINUTES * 60_000;
  return new Date(utcMs).toISOString();
}

/** UTC ISO string to `{ date, time }` for pre-filling Almaty wall-clock form inputs. */
export function utcIsoToAlmatyInput(iso: string | null): { date: string; time: string } {
  if (!iso) return { date: "", time: "23:59" };
  const almaty = new Date(new Date(iso).getTime() + ALMATY_OFFSET_MINUTES * 60_000);
  const date = `${almaty.getUTCFullYear()}-${String(almaty.getUTCMonth() + 1).padStart(2, "0")}-${String(almaty.getUTCDate()).padStart(2, "0")}`;
  const time = `${String(almaty.getUTCHours()).padStart(2, "0")}:${String(almaty.getUTCMinutes()).padStart(2, "0")}`;
  return { date, time };
}

export function formatAlmaty(iso: string | null): string {
  if (!iso) return "No due date";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Almaty",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(iso));
}
