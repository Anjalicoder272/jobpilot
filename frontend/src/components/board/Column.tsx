"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import type { Application, Status } from "@/lib/types";
import { cn } from "@/lib/utils";
import JobCard from "./JobCard";

export default function Column({
  status,
  label,
  color,
  empty,
  apps,
  total,
  onOpen,
  onAdvance,
  onAdd,
  filtering,
}: {
  status: Status;
  label: string;
  color: string;
  empty: string;
  apps: Application[];
  total: number;
  onOpen: (app: Application) => void;
  onAdvance?: (app: Application) => void;
  onAdd?: () => void;
  filtering: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status, disabled: filtering });

  return (
    <section
      aria-label={`${label}, ${total} applications`}
      className="flex w-[82vw] max-w-[300px] shrink-0 snap-start flex-col sm:w-[272px] lg:w-auto lg:min-w-[220px] lg:max-w-none lg:flex-1"
    >
      <header className="mb-2 flex h-8 items-center gap-2 px-1">
        <span className="h-2 w-2 rounded-full" style={{ background: color }} />
        <h2 className="text-[13px] font-medium">{label}</h2>
        <span className="tabular text-[13px] text-subtle">{filtering ? `${apps.length}/${total}` : total}</span>
        {onAdd && (
          <button
            onClick={onAdd}
            aria-label={`Add application to ${label}`}
            className="ml-auto grid h-7 w-7 place-items-center rounded-md text-subtle transition-colors hover:bg-surface-3 hover:text-text pointer-coarse:h-9 pointer-coarse:w-9"
          >
            <Plus size={15} />
          </button>
        )}
      </header>
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-[calc(100dvh-22rem)] flex-1 flex-col gap-2 rounded-xl p-1.5 transition-colors duration-150 lg:min-h-[420px]",
          isOver ? "bg-accent-soft ring-1 ring-inset ring-accent/30" : "bg-surface-2/70",
        )}
      >
        <SortableContext items={apps.map((a) => a.id)} strategy={verticalListSortingStrategy}>
          {apps.map((app) => (
            <JobCard key={app.id} app={app} onOpen={onOpen} onAdvance={onAdvance} dragDisabled={filtering} />
          ))}
        </SortableContext>
        {apps.length === 0 && (
          <p className="grid flex-1 place-items-center rounded-lg border border-dashed border-border-strong/70 px-4 py-8 text-center text-xs text-subtle">
            {filtering ? "No matches" : empty}
          </p>
        )}
      </div>
    </section>
  );
}
