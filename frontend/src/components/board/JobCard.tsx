"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowRight, BellRing, MapPin } from "lucide-react";
import { memo } from "react";
import { CompanyAvatar } from "@/components/ui/primitives";
import { COLUMNS, type Application } from "@/lib/types";
import { cn, relativeDays } from "@/lib/utils";

export function MatchPill({ score }: { score: number }) {
  const tone = score >= 75 ? "text-success bg-success-soft" : score >= 50 ? "text-accent-text bg-accent-soft" : "text-warning bg-warning-soft";
  return (
    <span title="Resume match" className={cn("tabular rounded-md px-1.5 py-0.5 text-[11px] font-semibold", tone)}>
      {score}%
    </span>
  );
}

export function CardBody({ app }: { app: Application }) {
  const followUp = app.is_follow_up_due && (app.status === "APPLIED" || app.status === "HR_REPLIED");
  return (
    <>
      <div className="flex items-start gap-3">
        <CompanyAvatar name={app.company} size={32} />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 break-words text-sm font-medium leading-5" title={app.role}>
            {app.role}
          </p>
          <p className="truncate text-[13px] text-muted">{app.company}</p>
        </div>
        {app.match_score !== null && <MatchPill score={app.match_score} />}
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-subtle">
        {app.location && (
          <span className="inline-flex min-w-0 items-center gap-1">
            <MapPin size={12} className="shrink-0" />
            <span className="truncate">{app.location}</span>
          </span>
        )}
        <span>Applied {relativeDays(app.applied_on)}</span>
      </div>
      {followUp && (
        <p className="mt-2.5 inline-flex items-center gap-1.5 rounded-md bg-warning-soft px-2 py-1 text-xs font-medium text-warning">
          <BellRing size={12} /> Follow up due
        </p>
      )}
    </>
  );
}

function JobCard({
  app,
  onOpen,
  onAdvance,
  dragDisabled,
}: {
  app: Application;
  onOpen: (app: Application) => void;
  onAdvance?: (app: Application) => void;
  dragDisabled?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: app.id,
    disabled: dragDisabled,
  });
  const nextStage = COLUMNS[COLUMNS.findIndex((c) => c.status === app.status) + 1];

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn("group relative", isDragging && "z-10")}
    >
      <div
        {...attributes}
        {...listeners}
        role="button"
        data-draggable={!dragDisabled}
        aria-roledescription="Draggable application"
        aria-label={`${app.role} at ${app.company}. Press Enter to open, Space to move.`}
        onClick={() => onOpen(app)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onOpen(app);
            return;
          }
          listeners?.onKeyDown?.(e);
        }}
        className={cn(
          "rounded-xl border border-border bg-surface p-3 shadow-xs outline-none transition-[border-color,box-shadow,opacity] duration-150",
          "hover:border-border-strong hover:shadow-sm focus-visible:border-accent focus-visible:ring-4 focus-visible:ring-[var(--ring)]",
          isDragging && "opacity-40",
        )}
      >
        <CardBody app={app} />
      </div>
      {onAdvance && nextStage && nextStage.status !== "REJECTED" && (
        <button
          onClick={() => onAdvance(app)}
          aria-label={`Move to ${nextStage.label}`}
          title={`Move to ${nextStage.label}`}
          className="absolute bottom-2.5 right-2.5 grid h-7 w-7 place-items-center rounded-md border border-border bg-surface text-muted opacity-0 shadow-xs transition-all duration-150 hover:text-text focus-visible:opacity-100 group-hover:opacity-100 pointer-coarse:hidden"
        >
          <ArrowRight size={14} />
        </button>
      )}
    </div>
  );
}

export default memo(JobCard);
