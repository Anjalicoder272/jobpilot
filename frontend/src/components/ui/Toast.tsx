"use client";

import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Tone = "success" | "error" | "info";
type ToastInput = { title: string; description?: string; tone?: Tone; action?: { label: string; onClick: () => void }; duration?: number };
type ToastItem = ToastInput & { id: number; leaving?: boolean };

const ToastContext = createContext<((t: ToastInput) => void) | null>(null);

const ICONS = { success: CheckCircle2, error: AlertCircle, info: Info };
const ICON_COLOR = { success: "text-success", error: "text-danger", info: "text-accent" };

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setItems((list) => list.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), 200);
  }, []);

  const toast = useCallback((input: ToastInput) => {
    const id = nextId.current++;
    setItems((list) => [...list.slice(-2), { tone: "success", ...input, id }]);
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-end sm:p-6"
      >
        {items.map((t) => (
          <ToastView key={t.id} item={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastView({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const Icon = ICONS[item.tone ?? "success"];
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const t = setTimeout(onDismiss, item.duration ?? (item.action ? 6000 : 3500));
    return () => clearTimeout(t);
  }, [paused, item.duration, item.action, onDismiss]);

  return (
    <div
      role={item.tone === "error" ? "alert" : "status"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className={cn(
        "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-border bg-surface p-3.5 pr-2 shadow-lg transition-all duration-200 ease-out",
        item.leaving ? "translate-y-2 opacity-0" : "animate-scale-in",
      )}
    >
      <Icon size={18} className={cn("mt-0.5 shrink-0", ICON_COLOR[item.tone ?? "success"])} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{item.title}</p>
        {item.description && <p className="mt-0.5 text-[13px] text-muted">{item.description}</p>}
      </div>
      {item.action && (
        <button
          onClick={() => {
            item.action!.onClick();
            onDismiss();
          }}
          className="shrink-0 rounded-md px-2 py-1 text-sm font-semibold text-accent-text transition-colors hover:bg-accent-soft"
        >
          {item.action.label}
        </button>
      )}
      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-subtle transition-colors hover:bg-surface-2 hover:text-text"
      >
        <X size={15} />
      </button>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
