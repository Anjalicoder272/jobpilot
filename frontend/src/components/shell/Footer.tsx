import Link from "next/link";
import Logo from "./Logo";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "/#features", label: "Features" },
      { href: "/#how-it-works", label: "How it works" },
      { href: "/signup", label: "Create a board" },
    ],
  },
  {
    title: "Prepare",
    links: [
      { href: "/experiences", label: "Interview experiences" },
      { href: "/experiences/new", label: "Share your experience" },
      { href: "/#faq", label: "FAQ" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-muted">
            One calm place for your job search: applications, resume fit and interview prep.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h2 className="text-[13px] font-medium text-text">{col.title}</h2>
            <ul className="mt-3 space-y-2.5">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-muted transition-colors hover:text-text">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-border">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-subtle sm:px-6">© {new Date().getFullYear()} JobPilot</p>
      </div>
    </footer>
  );
}
