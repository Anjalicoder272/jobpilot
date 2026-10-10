"use client";

import { LogOut, Moon, Sun } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/lib/auth";
import type { User } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useTheme } from "./ThemeToggle";

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "?";
}

export default function UserMenu({ user }: { user: User }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const { logout } = useAuth();
  const { theme, toggle } = useTheme();
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    root.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function onMenuKey(e: React.KeyboardEvent) {
    const items = [...(root.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
    const i = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowDown") items[(i + 1) % items.length]?.focus();
    if (e.key === "ArrowUp") items[(i - 1 + items.length) % items.length]?.focus();
    if (e.key === "ArrowDown" || e.key === "ArrowUp") e.preventDefault();
  }

  async function signOut() {
    setOpen(false);
    await logout();
    router.push("/");
    toast({ title: "You're signed out", tone: "info" });
  }

  const item =
    "flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-sm text-text transition-colors hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-none pointer-coarse:h-11";

  return (
    <div ref={root} className="relative">
      <button
        ref={button}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="grid h-9 w-9 place-items-center rounded-full border border-border bg-surface-2 text-xs font-semibold text-text transition-colors hover:border-border-strong pointer-coarse:h-11 pointer-coarse:w-11"
      >
        {initials(user.name)}
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Account"
          onKeyDown={onMenuKey}
          className={cn(
            "animate-scale-in absolute right-0 top-full z-50 mt-2 w-64 origin-top-right rounded-xl border border-border bg-surface p-1.5 shadow-lg",
          )}
        >
          <div className="px-2.5 pb-2 pt-1.5">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs text-subtle">{user.email}</p>
          </div>
          <div className="my-1 h-px bg-border" />
          <button role="menuitem" onClick={toggle} className={item}>
            {theme === "dark" ? <Sun size={16} className="text-subtle" /> : <Moon size={16} className="text-subtle" />}
            {theme === "dark" ? "Light theme" : "Dark theme"}
          </button>
          <button role="menuitem" onClick={signOut} className={item}>
            <LogOut size={16} className="text-subtle" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}
