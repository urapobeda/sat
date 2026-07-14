export const SAT_DATES = [
  "2026-08-22",
  "2026-09-12",
  "2026-10-03",
  "2026-11-07",
  "2026-12-05",
  "2027-03-06",
  "2027-05-01",
  "2027-06-05"
];

const SAT_START_HOUR = 8;

export type CountdownTime = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMilliseconds: number;
};

export function getNextSATDate() {
  const now = new Date();

  return (
    SAT_DATES.map((date) => parseSATDate(date))
      .sort((firstDate, secondDate) => firstDate.getTime() - secondDate.getTime())
      .find((satDate) => satDate.getTime() > now.getTime()) ?? null
  );
}

export function getCountdownTime(targetDate: Date | null): CountdownTime {
  if (!targetDate) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      totalMilliseconds: 0
    };
  }

  const now = new Date();
  const totalMilliseconds = Math.max(0, targetDate.getTime() - now.getTime());
  const totalSeconds = Math.floor(totalMilliseconds / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;

  return {
    days,
    hours,
    minutes,
    seconds,
    totalMilliseconds
  };
}

export function getSATCountdownBadge(days: number) {
  if (days <= 7) {
    return "Final Week";
  }

  if (days <= 30) {
    return "Less than 30 Days";
  }

  return "Upcoming Exam";
}

export function formatSATDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "full"
  }).format(date);
}

export function formatSATTime(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    hour12: true,
    minute: "2-digit"
  }).format(date);
}

export function formatSATDateForDatabase(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseSATDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day, SAT_START_HOUR, 0, 0, 0);
}
