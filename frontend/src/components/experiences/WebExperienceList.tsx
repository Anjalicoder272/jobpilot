import { ArrowUpRight } from "lucide-react";
import type { WebExperience } from "@/lib/types";
import { cn, safeHref } from "@/lib/utils";

export default function WebExperienceList({ items, compact = false }: { items: WebExperience[]; compact?: boolean }) {
  const safe = items.filter((i) => safeHref(i.url));
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
      {safe.map((item) => (
        <li key={item.url}>
          <a
            href={safeHref(item.url)}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className={cn("group flex items-start gap-3 transition-colors hover:bg-surface-2", compact ? "p-3" : "p-4")}
          >
            <span className="mt-0.5 inline-flex h-5 shrink-0 items-center rounded border border-border px-1.5 text-[11px] font-medium text-muted">
              {item.site}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium leading-snug">{item.title}</span>
              {!compact && item.snippet && <span className="mt-1 line-clamp-2 block text-[13px] text-muted">{item.snippet}</span>}
              {item.published && <span className="mt-1 block text-xs text-subtle">{item.published}</span>}
            </span>
            <ArrowUpRight size={16} className="mt-0.5 shrink-0 text-subtle transition-transform duration-150 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-text" />
          </a>
        </li>
      ))}
    </ul>
  );
}
