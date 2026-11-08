import { Clock3 } from "lucide-react";

type TimerProps = {
  seconds: number;
  label?: string;
};

export function Timer({ seconds, label }: TimerProps) {
  return (
    <span aria-label={label ? `${label}: ${formatTime(seconds)}` : undefined} className="inline-flex min-h-9 items-center gap-2 rounded-full bg-blue-50 px-4 text-sm font-black text-blue-700">
      <Clock3 size={17} />
      {label ? <span>{label}</span> : null}
      {formatTime(seconds)}
    </span>
  );
}

export function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;

  return `${minutes}:${remaining.toString().padStart(2, "0")}`;
}
