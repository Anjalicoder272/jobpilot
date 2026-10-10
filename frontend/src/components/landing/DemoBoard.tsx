"use client";

import { DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { Hand, PartyPopper } from "lucide-react";
import { useState } from "react";
import { fireConfetti } from "../fx/confetti";

// A small playable board on the landing page, so visitors can feel the product before signing up.
const COLS = [
  { id: "applied", label: "Applied", color: "#3b82f6" },
  { id: "replied", label: "HR Replied", color: "#f59e0b" },
  { id: "interview", label: "Interview", color: "#8b5cf6" },
  { id: "offer", label: "Offer", color: "#10b981" },
];

type DemoCard = { id: string; role: string; company: string; col: string; tint: string };

const START: DemoCard[] = [
  { id: "a", role: "Frontend Developer", company: "Nimbus Labs", col: "applied", tint: "#1d4ed8" },
  { id: "b", role: "React Developer", company: "PixelPay", col: "applied", tint: "#7c3aed" },
  { id: "c", role: "SDE-1 (Frontend)", company: "Lumen AI", col: "replied", tint: "#ea580c" },
  { id: "d", role: "Full Stack Developer", company: "Atlas Travel", col: "interview", tint: "#0891b2" },
];

function Card({ card }: { card: DemoCard }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: card.id });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{ transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0) rotate(3deg)` : undefined }}
      className={`mb-2 cursor-grab touch-none rounded-xl border border-border bg-surface p-3 text-left shadow-card transition-shadow hover:shadow-pop active:cursor-grabbing ${
        isDragging ? "relative z-10 shadow-pop" : "pop-in"
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-bold text-white" style={{ background: card.tint }}>
          {card.company[0]}
        </span>
        <div className="min-w-0">
          <div className="truncate text-xs font-semibold sm:text-sm">{card.role}</div>
          <div className="truncate text-[11px] text-muted">{card.company}</div>
        </div>
      </div>
    </div>
  );
}

function Col({ col, cards }: { col: (typeof COLS)[number]; cards: DemoCard[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id });
  return (
    <div
      ref={setNodeRef}
      data-col={col.id}
      className={`min-h-40 rounded-2xl p-2.5 transition-all duration-200 sm:p-3 ${
        isOver ? "pulse-ring scale-[1.02] bg-brand-soft" : "bg-surface-2"
      }`}
    >
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-muted">
        <span className="h-2 w-2 rounded-full" style={{ background: col.color }} />
        {col.label}
        <span className="ml-auto">{cards.length}</span>
      </div>
      {cards.map((c) => (
        <Card key={c.id} card={c} />
      ))}
    </div>
  );
}

export default function DemoBoard() {
  const [cards, setCards] = useState(START);
  const [message, setMessage] = useState("");
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over) return;
    const card = cards.find((c) => c.id === active.id)!;
    if (card.col === over.id) return;
    setCards((cs) => cs.map((c) => (c.id === active.id ? { ...c, col: String(over.id) } : c)));
    if (over.id === "offer") {
      fireConfetti();
      setMessage(`🎉 Offer from ${card.company}! That's the feeling we're building for.`);
    } else {
      setMessage(`Moved to ${COLS.find((c) => c.id === over.id)!.label}`);
    }
  }

  return (
    <div className="rounded-3xl border border-border bg-surface/80 p-3 shadow-pop backdrop-blur sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 px-1">
        <span className="inline-flex items-center gap-2 text-sm font-semibold">
          <Hand size={16} className="text-brand" /> Try it: drag a card to <span className="text-[#10b981]">Offer</span>
        </span>
        <button onClick={() => { setCards(START); setMessage(""); }} className="text-xs font-semibold text-muted hover:text-text">
          Reset
        </button>
      </div>
      <DndContext id="demo-board" sensors={sensors} onDragEnd={onDragEnd}>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
          {COLS.map((col) => (
            <Col key={col.id} col={col} cards={cards.filter((c) => c.col === col.id)} />
          ))}
        </div>
      </DndContext>
      <p aria-live="polite" className="mt-3 min-h-5 px-1 text-sm text-muted">
        {message && (
          <span key={message} className="toast-in inline-flex items-center gap-1.5">
            {message.startsWith("🎉") && <PartyPopper size={15} className="text-[#10b981]" />}
            {message.replace("🎉 ", "")}
          </span>
        )}
      </p>
    </div>
  );
}
