import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className={className}>
      <rect width="32" height="32" rx="8" className="fill-primary" />
      <path d="M20 8.5v9.5a5.5 5.5 0 0 1-11 0" fill="none" className="stroke-on-primary" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M16.5 11.5 20 8l3.5 3.5" fill="none" className="stroke-on-primary" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9" cy="18" r="2.1" className="fill-accent" />
    </svg>
  );
}

export default function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} aria-label="JobPilot home" className={cn("inline-flex items-center gap-2 rounded-md", className)}>
      <LogoMark />
      <span className="text-[15px] font-semibold tracking-tight">JobPilot</span>
    </Link>
  );
}
