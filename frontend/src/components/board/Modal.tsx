"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";

/** Accessible modal: focus moves in, Esc and the backdrop close it, focus goes back afterwards. */
export default function Modal({
  title,
  onClose,
  children,
  side = false,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  side?: boolean; // true = slide-in drawer from the right
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panelRef.current?.querySelector<HTMLElement>("input, textarea, select, button")?.focus();
    // Esc closes only the top-most dialog (e.g. the email window, not the drawer below it).
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const dialogs = document.querySelectorAll('[role="dialog"]');
      if (dialogs[dialogs.length - 1] === rootRef.current) onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      if (!document.querySelector('[role="dialog"]')) document.body.style.overflow = "";
      previous?.focus();
    };
  }, [onClose]);

  return (
    <div ref={rootRef} className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-[#0b1120]/50 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={panelRef}
        className={
          side
            ? "relative ml-auto flex h-full w-full max-w-lg flex-col overflow-y-auto border-l border-border bg-surface shadow-pop"
            : "relative m-auto max-h-[90vh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-3xl border border-border bg-surface shadow-pop"
        }
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface px-6 py-4">
          <h2 className="font-display text-lg font-bold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-muted hover:bg-surface-2">
            <X size={18} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
