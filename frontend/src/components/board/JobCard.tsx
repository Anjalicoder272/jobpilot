"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowRight, BellRing, MapPin } from "lucide-react";
import { memo } from "react";
import type { Application } from "@/lib/types";

// A stable, pleasant color for each company's avatar, based on its name.
const AVATAR_COLORS = ["#0d9488", "#0284c7", "#7c3aed", "#db2777", "#ea580c", "#16a34a", "#4f46e5"];
export function companyColor(name: string) {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function daysAgo(date: string) {
  const days = Math.round((Date.now() - new Date(date).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

export function CardBody({ app }: { app: Application }) {
  const color = companyColor(app.company);
  return (
    <>
      <div className="flex items-start gap-3">
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl font-display text-sm font-bold text-white"
          style={{ background: color }}
        >
          {app.company.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold" title={app.role}>{app.role}</div>
          <div className="truncate text-xs text-muted">{app.company}</div>
        </div>
        {app.match_score !== null && (
          <span
            title="Resume match"
            className="rounded-full px-2 py-0.5 text-xs font-bold"
            style={{
              background: app.match_score >= 75 ? "#10b98122" : "#f59e0b22",
              color: app.match_score >= 75 ? "#059669" : "#d97706",
            }}
          >
            {app.match_score}%
          </span>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
        {app.location && (
          <span className="inline-flex items-center gap-1">
            <MapPin size={12} /> {app.location}
          </span>
        )}
        <span>Applied {daysAgo(app.applied_on)}</span>
      </div>
      {app.is_follow_up_due && (app.status === "APPLIED" || app.status === "HR_REPLIED") && (
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent">
          <BellRing size={12} /> Follow up today
        </div>
      )}
    </>
  );
}

function JobCard({
  app,
  color,
  onOpen,
  onAdvance,
  dimmed,
}: {
  app: Application;
  color: string;
  onOpen: (app: Application) => void;
  onAdvance?: (app: Application) => void;
  dimmed?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: app.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      onClick={() => onOpen(app)}
      onKeyDown={(e) => {
        // Space/Enter pick the card up for keyboard dragging; "o" opens the details.
        if (e.key === "o") onOpen(app);
        listeners?.onKeyDown?.(e);
      }}
      aria-label={`${app.role} at ${app.company}. Press space to move, O to open.`}
      className={`group relative cursor-grab overflow-hidden rounded-2xl border border-border bg-surface p-3.5 pl-4 shadow-card transition duration-200 hover:-translate-y-0.5 hover:shadow-pop active:cursor-grabbing ${
        isDragging ? "opacity-40" : ""
      } ${dimmed ? "opacity-30 saturate-0" : ""}`}
    >
      {/* colored strip showing the column */}
      <span aria-hidden className="absolute inset-y-0 left-0 w-1" style={{ background: color }} />
      <div className="pop-in">
        <CardBody app={app} />
      </div>
      {onAdvance && (
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onAdvance(app);
          }}
          aria-label="Move to next stage"
          title="Move to next stage"
          className="absolute bottom-3 right-3 grid h-7 w-7 place-items-center rounded-full bg-brand-soft text-brand opacity-0 transition hover:scale-110 focus-visible:opacity-100 group-hover:opacity-100"
        >
          <ArrowRight size={14} />
        </button>
      )}
    </div>
  );
}

export default memo(JobCard);
