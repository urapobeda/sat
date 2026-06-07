import { TrendingUp } from "lucide-react";

const defaultScores = [1150, 1210, 1470, 1280, 1280];

type ScoreProgressChartProps = {
  scores?: number[];
};

export function ScoreProgressChart({ scores }: ScoreProgressChartProps) {
  const scoreValues = (scores?.length ? scores : defaultScores).slice(-5);
  const chartPoints = scoreValues.map((score, index) => {
    const x = 40 + index * (304 / Math.max(scoreValues.length - 1, 1));
    const y = 168 - ((score - 800) / 800) * 144;

    return {
      label: `Test ${index + 1}`,
      score,
      x,
      y: Math.max(24, Math.min(168, y))
    };
  });

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-xl font-black text-slate-950">Score Progress</h2>

      <div className="mt-5 overflow-hidden rounded-2xl bg-gradient-to-b from-white to-blue-50/40 p-3">
        <svg
          aria-label="SAT score progress across tests"
          className="h-64 w-full"
          role="img"
          viewBox="0 0 400 230"
        >
          {[1600, 1400, 1200, 1000, 800].map((value, index) => {
            const y = 24 + index * 36;

            return (
              <g key={value}>
                <line
                  stroke="#e2e8f0"
                  strokeDasharray={index === 0 ? "0" : "4 6"}
                  x1="32"
                  x2="365"
                  y1={y}
                  y2={y}
                />
                <text
                  fill="#64748b"
                  fontSize="12"
                  fontWeight="700"
                  x="0"
                  y={y + 4}
                >
                  {value}
                </text>
              </g>
            );
          })}

          {chartPoints.length > 1 ? (
            <polyline
              fill="none"
              points={chartPoints.map((point) => `${point.x},${point.y}`).join(" ")}
              stroke="#2563eb"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="5"
            />
          ) : null}

          {chartPoints.map((point, index) => (
            <g key={point.label}>
              <circle
                cx={point.x}
                cy={point.y}
                fill={index === chartPoints.length - 1 ? "white" : "#2563eb"}
                r="6"
                stroke="#2563eb"
                strokeWidth="4"
              />
              <text
                fill="#0f172a"
                fontSize="13"
                fontWeight="800"
                textAnchor="middle"
                x={point.x}
                y={point.y - 16}
              >
                {point.score}
              </text>
              <text
                fill="#64748b"
                fontSize="13"
                fontWeight="700"
                textAnchor="middle"
                x={point.x}
                y="204"
              >
                {point.label}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <div className="mt-4 flex items-center gap-3 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-bold text-slate-700">
        <TrendingUp className="text-blue-600" size={20} />
        <span>Keep practicing to improve your score!</span>
      </div>
    </article>
  );
}
