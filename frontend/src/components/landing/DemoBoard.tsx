"use client";

import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CheckCircle2, MousePointer2, RotateCcw } from "lucide-react";
import { useState } from "react";
import { CompanyAvatar } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

const COLS = [
  { id: "applied", label: "Applied", color: "var(--stage-applied)" },
  { id: "replied", label: "HR replied", color: "var(--stage-replied)" },
  { id: "interview", label: "Interview", color: "var(--stage-interview)" },
  { id: "offer", label: "Offer", color: "var(--stage-offer)" },
];

type DemoCard = { id: string; role: string; company: string; col: string; meta: string; score?: number };

const START: DemoCard[] = [
  { id: "a", role: "Frontend Engineer", company: "Nimbus Labs", col: "applied", meta: "Remote · 2d ago", score: 84 },
  { id: "b", role: "React Developer", company: "PixelPay", col: "applied", meta: "Bengaluru · 4d ago", score: 67 },
  { id: "c", role: "SDE-1, Web", company: "Lumen AI", col: "replied", meta: "Pune · 6d ago", score: 78 },
  { id: "d", role: "Full Stack Engineer", company: "Atlas Travel", col: "interview", meta: "Gurugram · 1w ago", score: 81 },
];

function Body({ card }: { card: DemoCard }) {
  return (
    <>
      <div className="flex items-start gap-2.5">
        <CompanyAvatar name={card.company} size={26} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium leading-5">{card.role}</p>
          <p className="truncate text-xs text-muted">{card.company}</p>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-subtle">
        <span className="truncate">{card.meta}</span>
        {card.score && <span className="tabular rounded bg-surface-2 px-1 font-medium text-muted">{card.score}%</span>}
      </div>
    </>
  );
}

function Card({ card }: { card: DemoCard }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: card.id });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      data-draggable="true"
      aria-label={`${card.role} at ${card.company}. Drag to another stage.`}
      className={cn(
        "rounded-lg border border-border bg-surface p-2.5 text-left shadow-xs transition-[opacity,box-shadow,border-color] duration-150 hover:border-border-strong hover:shadow-sm",
        isDragging && "opacity-30",
      )}
    >
      <Body card={card} />
    </div>
  );
}

function Col({ col, cards }: { col: (typeof COLS)[number]; cards: DemoCard[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id });
  return (
    <div className="min-w-0">
      <div className="mb-2 flex items-center gap-1.5 px-0.5 text-xs font-medium">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: col.color }} />
        {col.label}
        <span className="tabular text-subtle">{cards.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-44 flex-col gap-2 rounded-lg p-1.5 transition-colors duration-150",
          isOver ? "bg-accent-soft ring-1 ring-inset ring-accent/30" : "bg-surface-2",
        )}
      >
        {cards.map((c) => (
          <Card key={c.id} card={c} />
        ))}
      </div>
    </div>
  );
}

export default function DemoBoard() {
  const [cards, setCards] = useState(START);
  const [active, setActive] = useState<DemoCard | null>(null);
  const [message, setMessage] = useState("");
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
  );

  function onDragStart({ active }: DragStartEvent) {
    setActive(cards.find((c) => c.id === active.id) ?? null);
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    setActive(null);
    if (!over) return;
    const card = cards.find((c) => c.id === active.id)!;
    if (card.col === over.id) return;
    setCards((cs) => cs.map((c) => (c.id === active.id ? { ...c, col: String(over.id) } : c)));
    setMessage(over.id === "offer" ? `Offer from ${card.company}. That's the moment we're building for.` : `Moved to ${COLS.find((c) => c.id === over.id)!.label}.`);
  }

  return (
    <div className="rounded-2xl border border-border bg-surface/80 p-2 shadow-lg backdrop-blur-sm">
      <div className="rounded-xl border border-border bg-surface p-3 sm:p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="inline-flex items-center gap-1.5 text-xs font-medium text-muted">
            <MousePointer2 size={13} /> Try it: drag a card to Offer
          </p>
          <button
            onClick={() => {
              setCards(START);
              setMessage("");
            }}
            className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs text-subtle transition-colors hover:bg-surface-2 hover:text-text"
          >
            <RotateCcw size={12} /> Reset
          </button>
        </div>
        <DndContext id="demo-board" sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActive(null)}>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {COLS.map((col) => (
              <Col key={col.id} col={col} cards={cards.filter((c) => c.col === col.id)} />
            ))}
          </div>
          <DragOverlay dropAnimation={{ duration: 160, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" }}>
            {active && (
              <div className="w-[180px] rotate-2 cursor-grabbing rounded-lg border border-border-strong bg-surface p-2.5 shadow-lg">
                <Body card={active} />
              </div>
            )}
          </DragOverlay>
        </DndContext>
        <p aria-live="polite" className="mt-3 flex min-h-5 items-center gap-1.5 text-xs text-muted">
          {message && (
            <span key={message} className="animate-fade-up inline-flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-success" /> {message}
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
