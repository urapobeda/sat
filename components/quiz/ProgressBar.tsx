type ProgressBarProps = {
  className?: string;
  tone?: string;
  value: number;
};

export function ProgressBar({
  className = "",
  tone = "bg-blue-600",
  value
}: ProgressBarProps) {
  const width = `${Math.min(Math.max(value, 0), 100)}%`;

  return (
    <div
      className={["h-2.5 overflow-hidden rounded-full bg-slate-100", className].join(
        " "
      )}
    >
      <div
        className={`h-full rounded-full transition-all duration-300 ${tone}`}
        style={{ width }}
      />
    </div>
  );
}
