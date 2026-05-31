interface Props {
  score: number;
}

function scoreColor(n: number) {
  if (n >= 80) return "#22c55e";
  if (n >= 60) return "#f59e0b";
  if (n >= 40) return "#f97316";
  return "#ef4444";
}

function scoreLabel(n: number) {
  if (n >= 80) return "Good";
  if (n >= 60) return "Needs Work";
  if (n >= 40) return "Poor";
  return "Critical";
}

export default function ScoreBadge({ score }: Props) {
  const color = scoreColor(score);
  const r = 42;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;

  return (
    <div className="score-badge">
      <svg width="110" height="110" viewBox="0 0 110 110">
        <circle cx="55" cy="55" r={r} fill="none" stroke="#e5e7eb" strokeWidth="10" />
        <circle
          cx="55" cy="55" r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 55 55)"
        />
        <text x="55" y="50" textAnchor="middle" fontSize="22" fontWeight="700" fill={color}>
          {score}
        </text>
        <text x="55" y="67" textAnchor="middle" fontSize="11" fill="#6b7280">
          / 100
        </text>
      </svg>
      <span className="score-label" style={{ color }}>{scoreLabel(score)}</span>
    </div>
  );
}
