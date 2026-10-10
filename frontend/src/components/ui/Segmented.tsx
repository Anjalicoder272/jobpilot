"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** Single-choice control with a highlight that slides to the selected option. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  label: string;
  className?: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  // Local copy so the thumb moves on the click itself, not after the parent's state round-trip.
  const [current, setCurrent] = useState(value);
  useEffect(() => setCurrent(value), [value]);
  const [thumb, setThumb] = useState<{ left: number; width: number } | null>(null);
  const [animate, setAnimate] = useState(false);

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const measure = () => {
      const active = el.querySelector<HTMLElement>('[aria-checked="true"]');
      if (active) setThumb({ left: active.offsetLeft, width: active.offsetWidth });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [current]);

  // Skip the slide on first paint, so the thumb doesn't sweep in from the left on load.
  useLayoutEffect(() => {
    if (thumb && !animate) requestAnimationFrame(() => setAnimate(true));
  }, [thumb, animate]);

  function onKey(e: React.KeyboardEvent) {
    const i = options.findIndex((o) => o.value === current);
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = options[(i + step + options.length) % options.length];
    setCurrent(next.value);
    onChange(next.value);
    requestAnimationFrame(() => root.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus());
  }

  return (
    <div
      ref={root}
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKey}
      className={cn("relative inline-flex w-max shrink-0 rounded-lg border border-border bg-surface-2 p-0.5", className)}
    >
      {thumb && (
        <span
          aria-hidden
          className={cn(
            "absolute inset-y-0.5 rounded-md bg-surface shadow-xs ring-1 ring-border/60",
            animate && "transition-[left,width] duration-300 ease-[cubic-bezier(0.34,1.2,0.64,1)]",
          )}
          style={{ left: thumb.left, width: thumb.width }}
        />
      )}
      {options.map((o) => {
        const selected = current === o.value;
        return (
          <button
            key={o.value}
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => {
              setCurrent(o.value);
              onChange(o.value);
            }}
            className={cn(
              "relative z-10 h-8 whitespace-nowrap rounded-md px-3 text-[13px] font-medium transition-colors duration-200 pointer-coarse:h-10",
              selected ? "text-text" : "text-muted hover:text-text",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Toggle chip whose filled state grows in smoothly from the centre. */
export function Pill({ selected, onClick, children, className }: { selected: boolean; onClick: () => void; children: React.ReactNode; className?: string }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "relative isolate h-8 shrink-0 overflow-hidden whitespace-nowrap rounded-full border px-3.5 text-[13px] font-medium",
        "transition-[color,border-color,scale] duration-200 ease-out active:scale-[0.96] pointer-coarse:h-10",
        selected ? "border-primary text-on-primary" : "border-border bg-surface text-muted hover:border-border-strong hover:text-text",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute inset-0 -z-10 rounded-full bg-primary transition-[opacity,scale] duration-300 ease-[cubic-bezier(0.34,1.2,0.64,1)]",
          selected ? "scale-100 opacity-100" : "scale-75 opacity-0",
        )}
      />
      {children}
    </button>
  );
}
