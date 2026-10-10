"use client";

import { useEffect, useState } from "react";

/** Cycles through words with a soft blur-in animation. */
export default function RotatingWords({ words, interval = 2200 }: { words: string[]; interval?: number }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % words.length), interval);
    return () => clearInterval(id);
  }, [words.length, interval]);

  return (
    <span key={index} className="word-in text-gradient">
      {words[index]}
    </span>
  );
}
