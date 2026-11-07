export function ProgressMeter({ percent }: { percent: number }) {
  const clampedPercent = Math.max(0, Math.min(100, percent));

  return (
    <span className="h-1.5 w-28 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
      <span
        className="block h-full rounded-full bg-blue-600 transition-all"
        style={{ width: `${clampedPercent}%` }}
      />
    </span>
  );
}
