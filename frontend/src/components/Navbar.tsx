"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/board", label: "My board" },
  { href: "/job-match", label: "Job Match" },
  { href: "/insights", label: "Company insights" },
  { href: "/experiences", label: "Interview experiences" },
];

// "/" must match exactly; other links also match their sub-pages (e.g. /experiences/new).
const isActive = (pathname: string, href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

export default function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-bg/80 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:gap-6 sm:px-6">
        <Logo />
        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                isActive(pathname, link.href) ? "bg-brand-soft text-brand" : "text-muted hover:text-text"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <>
              <span className="hidden text-sm text-muted sm:inline">Hi, {user.name.split(" ")[0]}</span>
              <button
                onClick={async () => {
                  await logout();
                  router.push("/");
                }}
                aria-label="Log out"
                className="grid h-9 w-9 place-items-center rounded-full border border-border bg-surface text-muted transition hover:text-text"
              >
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium text-muted hover:text-text sm:px-4">
                Log in
              </Link>
              <Link
                href="/signup"
                className="bg-gradient-brand whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:opacity-90"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </nav>
      {/* Mobile links */}
      <div className="flex gap-1 overflow-x-auto px-4 pb-2 md:hidden">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`whitespace-nowrap rounded-full px-3 py-1 text-sm font-medium ${
              isActive(pathname, link.href) ? "bg-brand-soft text-brand" : "text-muted"
            }`}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </header>
  );
}
