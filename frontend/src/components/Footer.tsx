import { Mail, Phone } from "lucide-react";
import { LogoMark } from "./Logo";

/** LinkedIn "in" mark (the icon library no longer ships brand logos). */
function LinkedinIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
    </svg>
  );
}

const CONTACTS = [
  { icon: LinkedinIcon, label: "LinkedIn", value: "anjali-sharmacoder", href: "https://www.linkedin.com/in/anjali-sharmacoder/" },
  { icon: Phone, label: "Phone", value: "+91 91299 27658", href: "tel:+919129927658" },
  { icon: Mail, label: "Email", value: "anjalisharma.coder@gmail.com", href: "mailto:anjalisharma.coder@gmail.com" },
];

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-16 border-t border-border bg-surface-2/60">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 md:flex-row md:items-start md:justify-between">
        <div className="flex items-center gap-3">
          <LogoMark size={32} />
          <div>
            <p className="text-sm">
              Created by <span className="font-semibold text-text">Anjali Sharma</span>
            </p>
            <p className="text-xs text-muted">JobPilot · Built with Next.js and Django</p>
          </div>
        </div>
        <div>
          <ul className="flex flex-col items-start gap-2">
          {CONTACTS.map(({ icon: Icon, label, value, href }) => (
            <li key={label}>
              <a
                href={href}
                target={href.startsWith("http") ? "_blank" : undefined}
                rel={href.startsWith("http") ? "noreferrer" : undefined}
                aria-label={`${label}: ${value}`}
                className="press inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-1.5 text-sm text-muted transition hover:border-brand hover:text-brand"
              >
                <Icon size={15} /> {value}
              </a>
            </li>
          ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <p className="mx-auto max-w-7xl px-4 py-4 text-center text-xs text-muted sm:px-6">
          © {year} JobPilot. Created by Anjali Sharma. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
