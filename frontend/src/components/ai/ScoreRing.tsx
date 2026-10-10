"use client";

import { useEffect, useState } from "react";

export function scoreColor(score: number) {
  return score >= 75 ? "var(--success)" : score >= 50 ? "var(--accent)" : "var(--warning)";
}

export default function ScoreRing({ score, size = 88 }: { score: number; size?: number }) {
  const [shown, setShown] = useState(0);
  const stroke = 7;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(score));
    return () => cancelAnimationFrame(id);
  }, [score]);

  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }} role="img" aria-label={`Match score ${score} out of 100`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={scoreColor(score)}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - shown / 100)}
          style={{ transition: "stroke-dashoffset 900ms var(--ease-out)" }}
        />
      </svg>
      <span className="tabular absolute text-xl font-semibold tracking-tight">
        {score}
        <span className="text-xs text-subtle">%</span>
      </span>
    </div>
  );
}
