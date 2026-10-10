"use client";

import { useEffect, useRef } from "react";

/** A soft colored glow that follows the mouse across the hero section. */
export default function HeroGlow() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current?.parentElement;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      ref.current!.style.transform = `translate(${e.clientX - rect.left - 250}px, ${e.clientY - rect.top - 250}px)`;
    };
    el.addEventListener("mousemove", onMove);
    return () => el.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute left-0 top-0 hidden h-[500px] w-[500px] rounded-full opacity-25 blur-3xl transition-transform duration-300 ease-out md:block"
      style={{ background: "radial-gradient(circle, var(--brand) 0%, transparent 65%)" }}
    />
  );
}
