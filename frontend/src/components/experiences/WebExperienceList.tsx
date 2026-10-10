import { ArrowUpRight } from "lucide-react";
import type { WebExperience } from "@/lib/types";

export const SITE_COLORS: Record<string, string> = {
  LeetCode: "#f59e0b",
  GeeksforGeeks: "#16a34a",
  Glassdoor: "#0caa41",
  AmbitionBox: "#2563eb",
  Reddit: "#ff4500",
};

/** A list of real interview-experience posts on other sites. Clicking opens the original post. */
export default function WebExperienceList({ items, compact = false }: { items: WebExperience[]; compact?: boolean }) {
  return (
    <ul className={compact ? "space-y-2" : "space-y-3"}>
      {items.map((item, i) => {
        const color = SITE_COLORS[item.site] ?? "#64748b";
        return (
          <li key={item.url} className="pop-in" style={{ animationDelay: `${i * 50}ms` }}>
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className={`group flex items-start gap-3 rounded-2xl border border-border bg-surface transition hover:-translate-y-0.5 hover:shadow-pop ${
                compact ? "p-3" : "p-4"
              }`}
            >
              <span
                className="mt-0.5 shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                style={{ background: `${color}1f`, color }}
              >
                {item.site}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold leading-snug group-hover:text-brand">{item.title}</span>
                {!compact && item.snippet && <span className="mt-1 block text-sm text-muted">{item.snippet}</span>}
                {item.published && <span className="mt-1 block text-xs text-muted">{item.published}</span>}
              </span>
              <ArrowUpRight size={18} className="mt-0.5 shrink-0 text-muted transition group-hover:text-brand" />
            </a>
          </li>
        );
      })}
    </ul>
  );
}
