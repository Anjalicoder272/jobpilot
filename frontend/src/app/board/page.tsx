"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { Briefcase, CheckCircle2, ExternalLink, MessageSquareReply, Plus, Search, Sparkles, Trash2, Trophy } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import EmailDraftModal from "@/components/ai/EmailDraftModal";
import MatchPanel from "@/components/ai/MatchPanel";
import PrepPanel from "@/components/ai/PrepPanel";
import Column from "@/components/board/Column";
import { CardBody } from "@/components/board/JobCard";
import JobForm, { type JobFormValues } from "@/components/board/JobForm";
import Modal from "@/components/board/Modal";
import CountUp from "@/components/fx/CountUp";
import { fireConfetti } from "@/components/fx/confetti";
import { GhostButton, PrimaryButton, inputClass } from "@/components/ui/Field";
import { api, del, patch, post } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { COLUMNS, type Application, type Status } from "@/lib/types";

type Board = Record<Status, Application[]>;

function groupByStatus(apps: Application[]): Board {
  const board = Object.fromEntries(COLUMNS.map((c) => [c.status, [] as Application[]])) as Board;
  for (const app of apps) board[app.status].push(app);
  for (const col of Object.values(board)) col.sort((a, b) => a.position - b.position);
  return board;
}

// Empty follow-up dates must be sent as null, not "".
const toPayload = (v: JobFormValues) => ({ ...v, follow_up_on: v.follow_up_on || null });

export default function BoardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [board, setBoard] = useState<Board | null>(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [adding, setAdding] = useState(false);
  const [openApp, setOpenApp] = useState<Application | null>(null);
  const [query, setQuery] = useState("");
  const [emailFor, setEmailFor] = useState<Application | null>(null);
  const snapshot = useRef<Board | null>(null); // board before a drag, to undo if saving fails

  const sensors = useSensors(
    // A 6px move is needed to start a drag, so a normal click still opens the card.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  const load = useCallback(() => {
    api<Application[]>("/api/applications/")
      .then((apps) => setBoard(groupByStatus(apps)))
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(""), 3000);
  }

  // Which column holds this id? (The id is either a column status or a card id.)
  function columnOf(id: UniqueIdentifier, b: Board): Status | undefined {
    if (typeof id === "string" && id in b) return id as Status;
    return (Object.keys(b) as Status[]).find((s) => b[s].some((a) => a.id === id));
  }

  function onDragStart({ active }: DragStartEvent) {
    snapshot.current = board;
    setActiveId(active.id);
  }

  // While dragging over another column, move the card there so the user sees where it will land.
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

  async function onDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null);
    if (!board || !over) {
      if (snapshot.current) setBoard(snapshot.current);
      return;
    }
    const column = columnOf(active.id, board)!;
    let cards = board[column];
    const oldIndex = cards.findIndex((a) => a.id === active.id);
    const overIndex = cards.findIndex((a) => a.id === over.id);
    if (overIndex >= 0 && overIndex !== oldIndex) cards = arrayMove(cards, oldIndex, overIndex);
    const index = cards.findIndex((a) => a.id === active.id);
    const before = snapshot.current;
    setBoard({ ...board, [column]: cards }); // optimistic: the UI updates right away

    const unchanged = before && columnOf(active.id, before) === column &&
      before[column].findIndex((a) => a.id === active.id) === index;
    if (unchanged) return;

    try {
      await post(`/api/applications/${active.id}/move/`, { status: column, index });
      if (before && columnOf(active.id, before) !== column) celebrate(column);
    } catch {
      if (before) setBoard(before); // saving failed: put the card back
      showToast("Couldn't save the move. Please try again.");
    }
  }

  function celebrate(status: Status) {
    if (status === "OFFER") {
      fireConfetti();
      showToast("🎉 Congratulations on the offer!");
    } else if (status === "INTERVIEW") {
      showToast("Moved to Interview · open the card for your prep plan 📚");
    } else {
      showToast(`Moved to ${COLUMNS.find((c) => c.status === status)!.label}`);
    }
  }

  // The arrow button on a card: move it to the top of the next column.
  async function advance(app: Application) {
    if (!board) return;
    const i = COLUMNS.findIndex((c) => c.status === app.status);
    const next = COLUMNS[i + 1]?.status;
    if (!next || next === "REJECTED") return;
    const before = board;
    setBoard({
      ...board,
      [app.status]: board[app.status].filter((a) => a.id !== app.id),
      [next]: [{ ...app, status: next }, ...board[next]],
    });
    try {
      await post(`/api/applications/${app.id}/move/`, { status: next, index: 0 });
      celebrate(next);
    } catch {
      setBoard(before);
      showToast("Couldn't save the move. Please try again.");
    }
  }

  async function addJob(values: JobFormValues) {
    await post("/api/applications/", toPayload(values));
    setAdding(false);
    load();
    showToast("Application added");
  }

  async function saveJob(values: JobFormValues) {
    await patch(`/api/applications/${openApp!.id}/`, toPayload(values));
    setOpenApp(null);
    load();
    showToast("Saved");
  }

  // After a match check, update the open drawer and the card on the board.
  function onMatched(updated: Application) {
    setOpenApp(updated);
    setBoard((b) => b && { ...b, [updated.status]: b[updated.status].map((a) => (a.id === updated.id ? updated : a)) });
  }

  async function deleteJob() {
    if (!openApp || !confirm(`Delete ${openApp.role} at ${openApp.company}?`)) return;
    await del(`/api/applications/${openApp.id}/`);
    setOpenApp(null);
    load();
    showToast("Deleted");
  }

  const activeApp = board && activeId !== null
    ? Object.values(board).flat().find((a) => a.id === activeId)
    : undefined;
  const total = board ? Object.values(board).flat().length : 0;
  const replied = board ? total - board.APPLIED.length : 0;

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6">
      {/* Header + stats */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">My board</h1>
          <p className="mt-1 text-sm text-muted">Drag cards as your applications move forward.</p>
        </div>
        <PrimaryButton onClick={() => setAdding(true)} className="press">
          <Plus size={18} /> Add application
        </PrimaryButton>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Total applications", value: total, icon: Briefcase, color: "#3b82f6", bar: 100 },
          { label: "Response rate", value: total ? Math.round((replied / total) * 100) : 0, suffix: "%", icon: MessageSquareReply, color: "#f59e0b", bar: total ? (replied / total) * 100 : 0 },
          { label: "Interviews", value: board?.INTERVIEW.length ?? 0, icon: CheckCircle2, color: "#8b5cf6", bar: total ? ((board?.INTERVIEW.length ?? 0) / total) * 100 : 0 },
          { label: "Offers", value: board?.OFFER.length ?? 0, icon: Trophy, color: "#10b981", bar: total ? ((board?.OFFER.length ?? 0) / total) * 100 : 0 },
        ].map((s) => (
          <div key={s.label} className="group rounded-2xl border border-border bg-surface p-4 shadow-card transition hover:-translate-y-0.5 hover:shadow-pop">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted">{s.label}</span>
              <span className="grid h-8 w-8 place-items-center rounded-xl transition group-hover:scale-110" style={{ background: `${s.color}1f`, color: s.color }}>
                <s.icon size={16} />
              </span>
            </div>
            <div className="mt-1 font-display text-3xl font-extrabold">
              {board ? <CountUp value={s.value} suffix={s.suffix} /> : "–"}
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${s.bar}%`, background: s.color }} />
            </div>
          </div>
        ))}
      </div>

      {/* Quick search: non-matching cards fade out */}
      {total > 0 && (
        <div className="relative mt-6 max-w-sm">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            aria-label="Search your board"
            placeholder="Search company, role or city…"
            className={`${inputClass} pl-10`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      )}

      {error && <p role="alert" className="mt-6 text-sm text-[#e11d48]">{error}</p>}

      {board && total === 0 && (
        <div className="pop-in mt-8 rounded-3xl border border-border bg-surface p-10 text-center shadow-card">
          <span className="animated-gradient mx-auto grid h-16 w-16 place-items-center rounded-2xl text-white shadow-pop">
            <Sparkles size={28} />
          </span>
          <h2 className="mt-5 font-display text-2xl font-extrabold">Let&apos;s add your first application</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            Every job you apply to becomes a card. Drag it forward as HR replies, interviews happen and offers arrive.
          </p>
          <PrimaryButton onClick={() => setAdding(true)} className="press mt-6">
            <Plus size={18} /> Add my first application
          </PrimaryButton>
        </div>
      )}

      {/* Board */}
      <div className="mt-6 overflow-x-auto pb-4">
        {!board ? (
          <div className="flex gap-4">
            {COLUMNS.map((c) => (
              <div key={c.status} className="min-w-[15.5rem] flex-1 space-y-3 rounded-3xl bg-surface-2 p-3">
                <div className="skeleton h-5 w-24" />
                <div className="skeleton h-24" />
                <div className="skeleton h-24" />
              </div>
            ))}
          </div>
        ) : (
          <DndContext
            id="kanban-board"
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragEnd={onDragEnd}
            onDragCancel={() => {
              setActiveId(null);
              if (snapshot.current) setBoard(snapshot.current);
            }}
          >
            <div className="flex gap-4">
              {COLUMNS.map((c) => (
                <Column
                  key={c.status}
                  {...c}
                  apps={board[c.status]}
                  onOpen={setOpenApp}
                  onAdvance={c.status === "OFFER" || c.status === "REJECTED" ? undefined : advance}
                  query={query}
                />
              ))}
            </div>
            <DragOverlay>
              {activeApp && (
                <div className="w-72 rotate-2 rounded-2xl border border-brand/40 bg-surface p-3.5 shadow-pop">
                  <CardBody app={activeApp} />
                </div>
              )}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {adding && (
        <Modal title="Add application" onClose={() => setAdding(false)}>
          <JobForm submitLabel="Add to board" onSubmit={addJob} />
        </Modal>
      )}

      {openApp && (
        <Modal side title={`${openApp.role} · ${openApp.company}`} onClose={() => setOpenApp(null)}>
          <div className="mb-6 flex flex-wrap gap-2">
            {openApp.job_url && (
              <a href={openApp.job_url} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-border px-3.5 py-2 text-sm font-semibold">
                <ExternalLink size={16} /> Job post
              </a>
            )}
            <GhostButton onClick={deleteJob} className="ml-auto text-[#e11d48]">
              <Trash2 size={16} /> Delete
            </GhostButton>
          </div>
          {(openApp.status === "INTERVIEW" || openApp.status === "OFFER") && <PrepPanel app={openApp} />}
          <MatchPanel app={openApp} onUpdated={onMatched} onWriteEmail={() => setEmailFor(openApp)} />
          <JobForm key={openApp.updated_at ?? openApp.id} initial={openApp} submitLabel="Save changes" onSubmit={saveJob} />
        </Modal>
      )}

      {emailFor && <EmailDraftModal app={emailFor} onClose={() => setEmailFor(null)} />}

      {/* Small status message at the bottom */}
      <div aria-live="polite" className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
        {toast && (
          <div key={toast} className="toast-in rounded-full bg-text px-5 py-2.5 text-sm font-medium text-bg shadow-pop">{toast}</div>
        )}
      </div>
    </div>
  );
}
