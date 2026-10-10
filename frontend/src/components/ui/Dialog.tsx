"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';
const EXIT_MS = 180;
let openCount = 0;

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  variant?: "center" | "sheet";
  size?: "sm" | "md" | "lg";
  initialFocus?: "first" | "none";
};

/**
 * Accessible overlay: focus trap, Esc closes the top-most one, background scroll lock,
 * focus returns to the trigger, and an exit animation before unmount.
 * "sheet" is a right-hand drawer on desktop and a bottom sheet on phones.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  variant = "center",
  size = "md",
  initialFocus = "first",
}: DialogProps) {
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
    } else if (mounted) {
      setClosing(true);
      const t = setTimeout(() => setMounted(false), EXIT_MS);
      return () => clearTimeout(t);
    }
  }, [open, mounted]);

  useEffect(() => {
    if (!mounted) return;
    const previous = document.activeElement as HTMLElement | null;
    const root = panel.current;
    if (initialFocus === "first") {
      const target = root?.querySelector<HTMLElement>("[data-autofocus]") ?? root?.querySelector<HTMLElement>(FOCUSABLE);
      target?.focus({ preventScroll: true });
    } else {
      root?.focus({ preventScroll: true });
    }

    openCount += 1;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    document.body.style.paddingRight = `${scrollbar}px`;

    const onKey = (e: KeyboardEvent) => {
      const dialogs = document.querySelectorAll("[data-dialog-root]");
      if (dialogs[dialogs.length - 1] !== root?.parentElement) return;
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
      }
      if (e.key === "Tab" && root) {
        const items = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      openCount -= 1;
      if (openCount === 0) {
        document.body.style.overflow = "";
        document.body.style.paddingRight = "";
      }
      previous?.focus?.({ preventScroll: true });
    };
  }, [mounted, initialFocus]);

  if (!mounted) return null;

  const sheet = variant === "sheet";
  return createPortal(
    <div data-dialog-root className="fixed inset-0 z-50 flex" role="presentation">
      <div
        aria-hidden
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-[var(--overlay)] backdrop-blur-[2px] transition-opacity duration-200",
          closing ? "opacity-0" : "animate-fade-in",
        )}
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cn(
          "relative flex flex-col bg-surface shadow-lg outline-none transition-[opacity,transform] ease-out",
          sheet
            ? cn(
                "mt-auto max-h-[92dvh] w-full rounded-t-2xl border-t border-border sm:ml-auto sm:mt-0 sm:h-full sm:max-h-none sm:max-w-xl sm:rounded-none sm:border-l sm:border-t-0",
                closing
                  ? "translate-y-full duration-200 sm:translate-x-full sm:translate-y-0"
                  : "animate-slide-up sm:animate-slide-in-right",
              )
            : cn(
                "m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] rounded-2xl border border-border",
                size === "sm" ? "max-w-sm" : size === "lg" ? "max-w-2xl" : "max-w-lg",
                closing ? "translate-y-2 scale-[0.98] opacity-0 duration-150" : "animate-scale-in",
              ),
        )}
      >
        {sheet && <div aria-hidden className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-border-strong sm:hidden" />}
        <header className="flex shrink-0 items-start gap-4 px-5 pb-3 pt-4 sm:px-6 sm:pt-5">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-[17px] font-semibold leading-snug tracking-tight">
              {title}
            </h2>
            {description && (
              <p id={descId} className="mt-1 text-sm text-muted">
                {description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="-mr-2 -mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-lg text-subtle transition-colors hover:bg-surface-2 hover:text-text"
          >
            <X size={18} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 sm:px-6 sm:pb-6">{children}</div>
        {footer && (
          <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-border bg-surface px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  );
}
