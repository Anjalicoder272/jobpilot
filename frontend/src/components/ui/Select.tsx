"use client";

import { Check, ChevronDown } from "lucide-react";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export type SelectOption<T extends string> = { value: T; label: string; dot?: string };

type SelectProps<T extends string> = {
  value: T;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  id?: string;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  "aria-label"?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
  required?: boolean;
};

type Position = { left: number; width: number; top?: number; bottom?: number; maxHeight: number };

const GAP = 6;
const MAX_HEIGHT = 288;

/** Listbox select: keyboard (arrows, Home/End, type-ahead, Enter, Esc), flips up near the viewport edge. */
export function Select<T extends string>({
  value,
  onChange,
  options,
  id,
  className,
  placeholder = "Select",
  disabled,
  required,
  ...aria
}: SelectProps<T>) {
  const autoId = useId();
  const buttonId = id ?? autoId;
  const listId = `${buttonId}-list`;
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const typed = useRef({ text: "", at: 0 });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState<Position | null>(null);

  const selectedIndex = options.findIndex((o) => o.value === value);
  const selected = options[selectedIndex];

  const flipRef = useRef(false);

  const place = useCallback((decideFlip: boolean) => {
    const r = button.current?.getBoundingClientRect();
    if (!r) return;
    const below = window.innerHeight - r.bottom - GAP - 8;
    const above = r.top - GAP - 8;
    if (decideFlip) flipRef.current = below < Math.min(MAX_HEIGHT, options.length * 40) && above > below;
    const flip = flipRef.current;
    setPos((prev) => {
      const next: Position = {
        left: Math.round(r.left),
        width: Math.round(r.width),
        maxHeight: Math.max(120, Math.min(MAX_HEIGHT, flip ? above : below)),
        ...(flip ? { bottom: Math.round(window.innerHeight - r.top + GAP) } : { top: Math.round(r.bottom + GAP) }),
      };
      return prev && prev.left === next.left && prev.top === next.top && prev.bottom === next.bottom && prev.width === next.width ? prev : next;
    });
  }, [options.length]);

  useLayoutEffect(() => {
    if (!open) return;
    place(true);
    setActive(Math.max(0, selectedIndex));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Follow the trigger every frame while open, so the list stays attached through scrolling and
  // through parent animations (e.g. a drawer that is still sliding in).
  useEffect(() => {
    if (!open) return;
    let frame = 0;
    const tick = () => {
      place(false);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!button.current?.contains(t) && !list.current?.contains(t)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open, place]);

  useEffect(() => {
    if (open) list.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  function choose(index: number) {
    const option = options[index];
    if (option) onChange(option.value);
    setOpen(false);
    button.current?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    const last = options.length - 1;
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActive((i) => Math.min(last, i + 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActive((i) => Math.max(0, i - 1));
        break;
      case "Home":
        e.preventDefault();
        setActive(0);
        break;
      case "End":
        e.preventDefault();
        setActive(last);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        choose(active);
        break;
      case "Escape":
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
        break;
      case "Tab":
        setOpen(false);
        break;
      default:
        if (e.key.length === 1) {
          const now = Date.now();
          typed.current = { text: (now - typed.current.at < 600 ? typed.current.text : "") + e.key.toLowerCase(), at: now };
          const match = options.findIndex((o) => o.label.toLowerCase().startsWith(typed.current.text));
          if (match >= 0) setActive(match);
        }
    }
  }

  return (
    <>
      <button
        ref={button}
        id={buttonId}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        aria-required={required || undefined}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKeyDown}
        {...aria}
        className={cn(
          "flex h-10 w-full items-center gap-2 rounded-lg border border-border bg-surface px-3 text-left text-sm text-text shadow-xs",
          "transition-[border-color,box-shadow] duration-150 hover:border-border-strong pointer-coarse:h-11 pointer-coarse:text-base",
          "focus:outline-none focus-visible:border-accent/70 focus-visible:ring-[3px] focus-visible:ring-[var(--ring-soft)]",
          "aria-invalid:border-danger disabled:cursor-not-allowed disabled:opacity-60",
          open && "border-accent/70 ring-[3px] ring-[var(--ring-soft)]",
          className,
        )}
      >
        {selected?.dot && <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ background: selected.dot }} />}
        <span className={cn("min-w-0 flex-1 truncate", !selected && "text-subtle")}>{selected?.label ?? placeholder}</span>
        <ChevronDown size={15} className={cn("shrink-0 text-subtle transition-transform duration-200", open && "rotate-180")} />
      </button>

      {open &&
        pos &&
        createPortal(
          <ul
            ref={list}
            id={listId}
            role="listbox"
            aria-labelledby={buttonId}
            tabIndex={-1}
            style={{ left: pos.left, width: Math.max(pos.width, 160), top: pos.top, bottom: pos.bottom, maxHeight: pos.maxHeight }}
            className={cn(
              "fixed z-[70] overflow-y-auto overscroll-contain rounded-xl border border-border bg-surface p-1 shadow-lg",
              pos.bottom !== undefined ? "origin-bottom" : "origin-top",
              "animate-scale-in [animation-duration:140ms]",
            )}
          >
            {options.map((o, i) => {
              const isSelected = o.value === value;
              return (
                <li
                  key={o.value}
                  id={`${listId}-${i}`}
                  data-index={i}
                  role="option"
                  aria-selected={isSelected}
                  onPointerEnter={() => setActive(i)}
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={() => choose(i)}
                  className={cn(
                    "flex h-9 cursor-pointer select-none items-center gap-2 rounded-lg px-2.5 text-sm transition-colors pointer-coarse:h-11",
                    i === active ? "bg-surface-2 text-text" : "text-muted",
                    isSelected && "font-medium text-text",
                  )}
                >
                  {o.dot && <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ background: o.dot }} />}
                  <span className="min-w-0 flex-1 truncate">{o.label}</span>
                  {isSelected && <Check size={15} className="shrink-0 text-accent-text" />}
                </li>
              );
            })}
          </ul>,
          document.body,
        )}
    </>
  );
}
