"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Application, Status } from "@/lib/types";
import JobCard from "./JobCard";

export default function Column({
  status,
  label,
  color,
  apps,
  onOpen,
  onAdvance,
  query,
}: {
  status: Status;
  label: string;
  color: string;
  apps: Application[];
  onOpen: (app: Application) => void;
  onAdvance?: (app: Application) => void;
  query: string;
}) {
  // The column itself is a drop target, so cards can be dropped into an empty column.
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <section
      ref={setNodeRef}
      aria-label={`${label} column`}
      className={`flex min-w-[15.5rem] flex-1 flex-col rounded-3xl border p-3 transition-colors ${
        isOver ? "pulse-ring border-brand/50 bg-brand-soft/50" : "border-transparent bg-surface-2"
      }`}
    >
      <span aria-hidden className="mx-1 mb-3 h-1 rounded-full" style={{ background: color, opacity: 0.6 }} />
      <header className="mb-3 flex items-center gap-2 px-1">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
        <h2 className="text-sm font-semibold">{label}</h2>
        <span className="ml-auto rounded-full bg-surface px-2 py-0.5 text-xs font-semibold text-muted">
          {apps.length}
        </span>
      </header>
      <SortableContext items={apps.map((a) => a.id)} strategy={verticalListSortingStrategy}>
        <div className="flex min-h-24 flex-1 flex-col gap-2.5">
          {apps.map((app) => (
            <JobCard
              key={app.id}
              app={app}
              color={color}
              onOpen={onOpen}
              onAdvance={onAdvance}
              dimmed={!!query && !`${app.role} ${app.company} ${app.location}`.toLowerCase().includes(query.toLowerCase())}
            />
          ))}
          {apps.length === 0 && (
            <div className="grid flex-1 place-items-center rounded-2xl border-2 border-dashed border-border p-4 text-center text-xs text-muted">
              Drop a card here
            </div>
          )}
        </div>
      </SortableContext>
    </section>
  );
}
