"use client";

import { useEffect, useState } from "react";

/** Circular score that animates from 0 to the value. */
export default function ScoreRing({ score, size = 96 }: { score: number; size?: number }) {
  const [shown, setShown] = useState(0);
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const color = score >= 75 ? "#10b981" : score >= 50 ? "#3b82f6" : "#f59e0b";

  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(score));
    return () => cancelAnimationFrame(id);
  }, [score]);

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--surface-2)" strokeWidth="10" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - shown / 100)}
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
      </svg>
      <span className="absolute font-display text-2xl font-extrabold" style={{ color }}>
        {score}%
      </span>
    </div>
  );
}
