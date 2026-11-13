/** Count consecutive calendar days, including yesterday when today is inactive. */
export function getSessionStreak(
  attempts: ReadonlyArray<{ date: string }>,
  now: number,
  timeZone: string
) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric"
  });
  function calendarDay(timestamp: number) {
    const parts = formatter.formatToParts(timestamp);
    const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
    // UTC encodes the calendar date here, so DST never creates 23/25-hour gaps.
    return Date.UTC(value("year"), value("month") - 1, value("day")) / 86_400_000;
  }
  const activeDays = new Set(attempts
    .map((attempt) => Date.parse(attempt.date))
    .filter(Number.isFinite)
    .map(calendarDay));
  const today = calendarDay(now);
  let day = activeDays.has(today) ? today : today - 1;
  let count = 0;
  while (activeDays.has(day)) {
    count++;
    day--;
  }
  return count;
}
