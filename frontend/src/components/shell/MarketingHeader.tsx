"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";

const LINKS = [
  { href: "/#features", label: "Features" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/experiences", label: "Interview questions" },
  { href: "/#faq", label: "FAQ" },
];

export default function MarketingHeader() {
  const { user, loading } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 transition-[background-color,border-color] duration-200",
        scrolled || open ? "border-b border-border bg-bg/85 backdrop-blur-md" : "border-b border-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-4 sm:px-6">
        <Logo />
        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="rounded-md px-3 py-1.5 text-sm text-muted transition-colors hover:text-text">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto hidden items-center gap-1.5 md:flex">
          <ThemeToggle />
          {loading ? (
            <div className="skeleton h-8 w-28" />
          ) : user ? (
            <ButtonLink href="/board" size="sm">
              Open my board
            </ButtonLink>
          ) : (
            <>
              <ButtonLink href="/login" variant="ghost" size="sm">
                Log in
              </ButtonLink>
              <ButtonLink href="/signup" size="sm">
                Get started
              </ButtonLink>
            </>
          )}
        </div>
        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          className="-mr-2 ml-auto grid h-11 w-11 place-items-center rounded-lg text-text md:hidden"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
      {open && (
        <div id="mobile-menu" className="animate-fade-in h-[calc(100dvh-4rem)] overflow-y-auto border-t border-border bg-bg px-4 pb-8 md:hidden">
          <nav aria-label="Mobile" className="flex flex-col py-2">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="flex h-12 items-center border-b border-border text-[15px] font-medium"
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="mt-6 grid gap-2">
            {user ? (
              <ButtonLink href="/board" size="lg" onClick={() => setOpen(false)}>
                Open my board
              </ButtonLink>
            ) : (
              <>
                <ButtonLink href="/signup" size="lg" onClick={() => setOpen(false)}>
                  Get started for free
                </ButtonLink>
                <ButtonLink href="/login" variant="secondary" size="lg" onClick={() => setOpen(false)}>
                  Log in
                </ButtonLink>
              </>
            )}
          </div>
          <div className="mt-6 flex items-center justify-between text-sm text-muted">
            Theme <ThemeToggle />
          </div>
        </div>
      )}
    </header>
  );
}
