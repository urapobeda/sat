import { TrendingUp } from "lucide-react";

const chartPoints = [
  { label: "Test 1", score: 1150, x: 40, y: 124 },
  { label: "Test 2", score: 1210, x: 116, y: 108 },
  { label: "Test 3", score: 1470, x: 192, y: 48 },
  { label: "Test 4", score: 1280, x: 268, y: 88 },
  { label: "Test 5", score: 1280, x: 344, y: 88 }
];

export function ScoreProgressChart() {
  const solidPoints = chartPoints.slice(0, 4);
  const predictedPoint = chartPoints[4];

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

          <polyline
            fill="none"
            points={solidPoints.map((point) => `${point.x},${point.y}`).join(" ")}
            stroke="#2563eb"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="5"
          />
          <line
            stroke="#2563eb"
            strokeDasharray="6 7"
            strokeLinecap="round"
            strokeWidth="4"
            x1={solidPoints[3].x}
            x2={predictedPoint.x}
            y1={solidPoints[3].y}
            y2={predictedPoint.y}
          />

          {chartPoints.map((point, index) => (
            <g key={point.label}>
              <circle
                cx={point.x}
                cy={point.y}
                fill={index === 4 ? "white" : "#2563eb"}
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
