"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { BellRing, KanbanSquare, Plus, Search, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ApplicationSheet from "@/components/board/ApplicationSheet";
import Column from "@/components/board/Column";
import { CardBody } from "@/components/board/JobCard";
import JobForm, { type JobFormValues } from "@/components/board/JobForm";
import { Button } from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/Confirm";
import { Dialog } from "@/components/ui/Dialog";
import { inputClass } from "@/components/ui/Field";
import { EmptyState, PageHeader, Skeleton } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toast";
import { api, del, errorMessage, patch, post } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth";
import { COLUMNS, stageOf, type Application, type Status } from "@/lib/types";
import { cn } from "@/lib/utils";

type Board = Record<Status, Application[]>;

function groupByStatus(apps: Application[]): Board {
  const board = Object.fromEntries(COLUMNS.map((c) => [c.status, [] as Application[]])) as Board;
  for (const app of apps) board[app.status].push(app);
  for (const col of Object.values(board)) col.sort((a, b) => a.position - b.position);
  return board;
}

const toPayload = (v: Partial<JobFormValues>) => ("follow_up_on" in v ? { ...v, follow_up_on: v.follow_up_on || null } : v);

function matches(app: Application, q: string) {
  return `${app.role} ${app.company} ${app.location}`.toLowerCase().includes(q);
}

export default function BoardPage() {
  const { ready } = useRequireAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [board, setBoard] = useState<Board | null>(null);
  const [loadError, setLoadError] = useState("");
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [adding, setAdding] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [dueOnly, setDueOnly] = useState(false);
  const snapshot = useRef<Board | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // A short press before dragging, so swiping still scrolls the board on phones.
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const load = useCallback(() => {
    setLoadError("");
    api<Application[]>("/api/applications/")
      .then((apps) => setBoard(groupByStatus(apps)))
      .catch((e) => setLoadError(errorMessage(e, "Couldn't load your board.")));
  }, []);

  useEffect(() => {
    if (ready) load();
  }, [ready, load]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement).closest("input, textarea, select, [contenteditable]");
      if (typing || e.metaKey || e.ctrlKey || e.altKey || document.querySelector("[data-dialog-root]")) return;
      if (e.key === "n") {
        e.preventDefault();
        setAdding(true);
      } else if (e.key === "/") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const all = useMemo(() => (board ? Object.values(board).flat() : []), [board]);
  const openApp = all.find((a) => a.id === openId) ?? null;
  const activeApp = activeId !== null ? all.find((a) => a.id === activeId) : undefined;
  const q = query.trim().toLowerCase();
  const filtering = !!q || dueOnly;
  const dueCount = all.filter((a) => a.is_follow_up_due && (a.status === "APPLIED" || a.status === "HR_REPLIED")).length;

  const visible = (status: Status) =>
    (board?.[status] ?? []).filter((a) => (!q || matches(a, q)) && (!dueOnly || a.is_follow_up_due));

  const replaceApp = useCallback((updated: Application) => {
    setBoard((b) => {
      if (!b) return b;
      const next = { ...b };
      for (const s of Object.keys(next) as Status[]) next[s] = next[s].filter((a) => a.id !== updated.id);
      const target = b[updated.status].some((a) => a.id === updated.id)
        ? b[updated.status].map((a) => (a.id === updated.id ? updated : a))
        : [updated, ...next[updated.status]];
      next[updated.status] = target;
      return next;
    });
  }, []);

  function columnOf(id: UniqueIdentifier, b: Board): Status | undefined {
    if (typeof id === "string" && id in b) return id as Status;
    return (Object.keys(b) as Status[]).find((s) => b[s].some((a) => a.id === id));
  }

  async function saveMove(id: number, status: Status, index: number, before: Board, announce = true) {
    const from = columnOf(id, before)!;
    const oldIndex = before[from].findIndex((a) => a.id === id);
    try {
      await post(`/api/applications/${id}/move/`, { status, index });
      if (!announce || from === status) return;
      const app = before[from][oldIndex];
      toast({
        title: `Moved to ${stageOf(status).label}`,
        description: status === "INTERVIEW" ? "Open the card for an interview prep plan." : `${app.role} · ${app.company}`,
        action: { label: "Undo", onClick: () => undoMove(id, from, oldIndex) },
      });
    } catch (e) {
      setBoard(before);
      toast({ title: "Couldn't save the move", description: errorMessage(e), tone: "error" });
    }
  }

  function undoMove(id: number, status: Status, index: number) {
    setBoard((b) => {
      if (!b) return b;
      const from = columnOf(id, b);
      if (!from) return b;
      const card = b[from].find((a) => a.id === id)!;
      const target = b[status].filter((a) => a.id !== id);
      target.splice(Math.min(index, target.length), 0, { ...card, status });
      const next = { ...b, [from]: b[from].filter((a) => a.id !== id) };
      next[status] = target;
      return next;
    });
    post(`/api/applications/${id}/move/`, { status, index }).catch(() => {
      toast({ title: "Couldn't undo the move", tone: "error" });
      load();
    });
  }

  function onDragStart({ active }: DragStartEvent) {
    snapshot.current = board;
    setActiveId(active.id);
    document.body.classList.add("is-dragging");
  }

  function onDragOver({ active, over }: DragOverEvent) {
    if (!board || !over) return;
    const from = columnOf(active.id, board);
    const to = columnOf(over.id, board);
    if (!from || !to || from === to) return;
    setBoard((b) => {
      if (!b) return b;
      const card = b[from].find((a) => a.id === active.id)!;
      const overIndex = b[to].findIndex((a) => a.id === over.id);
      const target = [...b[to]];
      target.splice(overIndex >= 0 ? overIndex : target.length, 0, { ...card, status: to });
      return { ...b, [from]: b[from].filter((a) => a.id !== active.id), [to]: target };
    });
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null);
    document.body.classList.remove("is-dragging");
    const before = snapshot.current;
    if (!board || !over || !before) {
      if (before) setBoard(before);
      return;
    }
    const column = columnOf(active.id, board)!;
    let cards = board[column];
    const oldIndex = cards.findIndex((a) => a.id === active.id);
    const overIndex = cards.findIndex((a) => a.id === over.id);
    if (overIndex >= 0 && overIndex !== oldIndex) cards = arrayMove(cards, oldIndex, overIndex);
    const index = cards.findIndex((a) => a.id === active.id);
    setBoard({ ...board, [column]: cards });

    const unchanged = columnOf(active.id, before) === column && before[column].findIndex((a) => a.id === active.id) === index;
    if (!unchanged) saveMove(active.id as number, column, index, before);
  }

  function moveTo(app: Application, status: Status) {
    if (!board || app.status === status) return;
    const before = board;
    setBoard({
      ...board,
      [app.status]: board[app.status].filter((a) => a.id !== app.id),
      [status]: [{ ...app, status }, ...board[status]],
    });
    saveMove(app.id, status, 0, before);
  }

  const advance = useCallback(
    (app: Application) => {
      const next = COLUMNS[COLUMNS.findIndex((c) => c.status === app.status) + 1]?.status;
      if (next && next !== "REJECTED") moveTo(app, next);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [board],
  );

  async function addJob(values: JobFormValues) {
    const created = await post<Application>("/api/applications/", toPayload(values));
    setAdding(false);
    setBoard((b) => b && { ...b, APPLIED: [created, ...b.APPLIED] });
    toast({ title: "Application added", description: `${created.role} · ${created.company}` });
  }

  async function saveJob(app: Application, values: Partial<JobFormValues>) {
    const updated = await patch<Application>(`/api/applications/${app.id}/`, toPayload(values));
    replaceApp(updated);
    toast({ title: "follow_up_on" in values && Object.keys(values).length === 1 ? "Next reminder in 5 days" : "Changes saved" });
  }

  async function deleteJob(app: Application) {
    const ok = await confirm({
      title: "Delete this application?",
      description: `${app.role} at ${app.company} will be removed with its match result and prep plan. This can't be undone.`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    const before = board;
    setOpenId(null);
    setBoard((b) => b && { ...b, [app.status]: b[app.status].filter((a) => a.id !== app.id) });
    try {
      await del(`/api/applications/${app.id}/`);
      toast({ title: "Application deleted" });
    } catch (e) {
      setBoard(before);
      toast({ title: "Couldn't delete", description: errorMessage(e), tone: "error" });
    }
  }

  const total = all.length;
  const responded = board ? total - board.APPLIED.length : 0;
  const stats = [
    { label: "Applications", value: total },
    { label: "Response rate", value: total ? `${Math.round((responded / total) * 100)}%` : "–" },
    { label: "Interviews", value: board?.INTERVIEW.length ?? 0 },
    { label: "Offers", value: board?.OFFER.length ?? 0 },
  ];

  return (
    <div className="mx-auto max-w-[1440px] px-4 pt-6 sm:px-6 sm:pt-8">
      <PageHeader
        title="Board"
        description={board ? (total ? "Drag cards as your applications move forward." : "Every job you apply to becomes a card here.") : " "}
        actions={
          <Button onClick={() => setAdding(true)} className="max-sm:w-full">
            <Plus size={16} /> Add application
            <kbd className="ml-1 hidden rounded border border-white/20 px-1.5 font-mono text-[11px] text-on-primary/70 lg:inline">N</kbd>
          </Button>
        }
      />

      <dl className="mt-6 grid grid-cols-2 overflow-hidden rounded-xl border border-border bg-surface shadow-xs sm:grid-cols-4">
        {stats.map((s, i) => (
          <div
            key={s.label}
            className={cn("px-4 py-3.5 sm:px-5", i % 2 === 1 && "border-l border-border", i >= 2 && "border-t border-border sm:border-t-0", i === 2 && "sm:border-l")}
          >
            <dt className="text-xs text-subtle">{s.label}</dt>
            <dd className="tabular mt-1 text-2xl font-semibold tracking-tight">{board ? s.value : <Skeleton className="mt-1 h-7 w-12" />}</dd>
          </div>
        ))}
      </dl>

      {loadError && (
        <div className="mt-6">
          <EmptyState title="Couldn't load your board" description={loadError} action={<Button variant="secondary" onClick={load}>Try again</Button>} />
        </div>
      )}

      {board && total === 0 && (
        <div className="animate-fade-up mt-6">
          <EmptyState
            icon={<KanbanSquare size={20} />}
            title="Add your first application"
            description="Track it from applied to offer. Paste the job description to get a resume match score and, later, an interview prep plan."
            action={
              <Button onClick={() => setAdding(true)}>
                <Plus size={16} /> Add application
              </Button>
            }
          />
        </div>
      )}

      {board && total > 0 && (
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-xs">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
            <input
              ref={searchRef}
              type="search"
              aria-label="Filter applications"
              placeholder="Filter by company, role, city"
              className={cn(inputClass, "pl-9 pr-9")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && setQuery("")}
            />
            {query ? (
              <button onClick={() => setQuery("")} aria-label="Clear filter" className="absolute right-1 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-subtle hover:text-text">
                <X size={14} />
              </button>
            ) : (
              <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-border px-1.5 font-mono text-[11px] text-subtle lg:block">/</kbd>
            )}
          </div>
          {dueCount > 0 && (
            <button
              onClick={() => setDueOnly((d) => !d)}
              aria-pressed={dueOnly}
              className={cn(
                "inline-flex h-10 items-center gap-2 self-start rounded-lg border px-3 text-sm font-medium transition-colors pointer-coarse:h-11",
                dueOnly ? "border-warning/40 bg-warning-soft text-warning" : "border-border bg-surface text-muted hover:text-text",
              )}
            >
              <BellRing size={14} /> {dueCount} follow-up{dueCount > 1 ? "s" : ""} due
            </button>
          )}
        </div>
      )}

      <div className="-mx-4 mt-4 snap-x snap-mandatory overflow-x-auto scroll-px-4 px-4 pb-6 sm:-mx-6 sm:scroll-px-6 sm:px-6">
        {!board && !loadError ? (
          <div className="flex gap-3" aria-busy aria-label="Loading board">
            {COLUMNS.map((c) => (
              <div key={c.status} className="w-[82vw] max-w-[300px] shrink-0 space-y-2 sm:w-[272px] lg:w-auto lg:flex-1">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-24 rounded-xl" />
                <Skeleton className="h-24 rounded-xl" />
              </div>
            ))}
          </div>
        ) : board && total > 0 ? (
          <DndContext
            id="kanban-board"
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragEnd={onDragEnd}
            onDragCancel={() => {
              setActiveId(null);
              document.body.classList.remove("is-dragging");
              if (snapshot.current) setBoard(snapshot.current);
            }}
            accessibility={{
              announcements: {
                onDragStart: ({ active }) => `Picked up ${all.find((a) => a.id === active.id)?.role ?? "card"}.`,
                onDragOver: ({ over }) => (over ? `Over ${board && columnOf(over.id, board) ? stageOf(columnOf(over.id, board)!).label : ""}.` : ""),
                onDragEnd: ({ over }) => (over && board ? `Dropped in ${stageOf(columnOf(over.id, board) ?? "APPLIED").label}.` : "Dropped."),
                onDragCancel: () => "Move cancelled.",
              },
            }}
          >
            <div className="flex gap-3">
              {COLUMNS.map((c) => (
                <Column
                  key={c.status}
                  {...c}
                  apps={visible(c.status)}
                  total={board[c.status].length}
                  onOpen={(a) => setOpenId(a.id)}
                  onAdvance={advance}
                  onAdd={c.status === "APPLIED" ? () => setAdding(true) : undefined}
                  filtering={filtering}
                />
              ))}
            </div>
            <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" }}>
              {activeApp && (
                <div className="w-[260px] rotate-[1.5deg] cursor-grabbing rounded-xl border border-border-strong bg-surface p-3 shadow-lg">
                  <CardBody app={activeApp} />
                </div>
              )}
            </DragOverlay>
          </DndContext>
        ) : null}
      </div>

      <Dialog open={adding} onClose={() => setAdding(false)} title="Add application" description="Only company and role are required. You can fill in the rest later." size="lg">
        <JobForm submitLabel="Add to board" onSubmit={addJob} onCancel={() => setAdding(false)} />
      </Dialog>

      <ApplicationSheet
        app={openApp}
        onClose={() => setOpenId(null)}
        onSave={saveJob}
        onMove={moveTo}
        onDelete={deleteJob}
        onUpdated={replaceApp}
      />
    </div>
  );
}
