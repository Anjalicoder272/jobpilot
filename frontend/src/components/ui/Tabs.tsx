"use client";

import { useId, useRef } from "react";
import { cn } from "@/lib/utils";

export function Tabs<T extends string>({
  value,
  onChange,
  tabs,
  label,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  tabs: { value: T; label: string; badge?: React.ReactNode }[];
  label: string;
  className?: string;
}) {
  const id = useId();
  const list = useRef<HTMLDivElement>(null);

  function onKey(e: React.KeyboardEvent) {
    const i = tabs.findIndex((t) => t.value === value);
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = tabs[(i + step + tabs.length) % tabs.length];
    onChange(next.value);
    list.current?.querySelector<HTMLElement>(`[data-tab="${next.value}"]`)?.focus();
  }

  return (
    <div ref={list} role="tablist" aria-label={label} onKeyDown={onKey} className={cn("flex gap-1 border-b border-border", className)}>
      {tabs.map((t) => {
        const selected = t.value === value;
        return (
          <button
            key={t.value}
            role="tab"
            id={`${id}-${t.value}`}
            data-tab={t.value}
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(t.value)}
            className={cn(
              "relative -mb-px inline-flex h-10 items-center gap-1.5 px-2.5 text-sm font-medium transition-colors pointer-coarse:h-11",
              selected ? "text-text" : "text-subtle hover:text-text",
            )}
          >
            {t.label}
            {t.badge}
            <span
              aria-hidden
              className={cn(
                "absolute inset-x-1 bottom-0 h-0.5 rounded-full bg-text transition-transform duration-200 ease-out",
                selected ? "scale-x-100" : "scale-x-0",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
