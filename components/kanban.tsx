"use client";

import { useState } from "react";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { Link2 } from "lucide-react";
import type { Status, ProjectType, Priority } from "@prisma/client";
import { STATUS_META, STATUS_ORDER, TYPE_META } from "@/lib/design";
import { PriorityPill, TypeChip, Avatar } from "./pills";
import { setStatus } from "@/lib/actions";
import { cn } from "@/lib/utils";

type Card = {
  id: string;
  name: string;
  status: Status;
  type: ProjectType;
  priority: Priority;
  crmOpportunityName: string | null;
  dueDate: string | null;
  lead: { name: string; color: string } | null;
};

function CardBody({ p, dragging }: { p: Card; dragging?: boolean }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-hairline bg-surface p-3 pl-3.5 shadow-card",
        dragging && "rotate-2 shadow-pop"
      )}
    >
      <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: TYPE_META[p.type].color }} />
      <div className="mb-1.5 flex items-center justify-between">
        <TypeChip type={p.type} />
        <PriorityPill priority={p.priority} />
      </div>
      <div className="line-clamp-2 font-display text-sm font-semibold leading-snug tracking-tight">
        {p.name}
      </div>
      {p.crmOpportunityName && (
        <div className="mt-1.5 flex items-center gap-1 text-[11px] text-muted">
          <Link2 size={11} className="text-faint" />
          <span className="truncate">{p.crmOpportunityName}</span>
        </div>
      )}
      {p.lead && (
        <div className="mt-2 flex justify-end">
          <Avatar name={p.lead.name} color={p.lead.color} size={20} />
        </div>
      )}
    </div>
  );
}

function DraggableCard({ p }: { p: Card }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: p.id });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} className={cn("touch-none", isDragging && "opacity-40")}>
      <Link href={`/projects/${p.id}`} onClick={(e) => e.stopPropagation()} className="block">
        <CardBody p={p} />
      </Link>
    </div>
  );
}

function Column({ status, cards }: { status: Status; cards: Card[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const m = STATUS_META[status];
  return (
    <div className="flex w-[270px] shrink-0 flex-col">
      <div className="mb-2.5 flex items-center gap-2 px-1">
        <span className="h-2 w-2 rounded-full" style={{ background: m.dot }} />
        <span className="text-sm font-semibold tracking-tight">{m.label}</span>
        <span className="ml-auto rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium tabular-nums text-muted">
          {cards.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-[120px] flex-1 flex-col gap-2.5 rounded-2xl border border-dashed p-2.5 transition-colors",
          isOver ? "border-accent bg-accent-soft/40" : "border-hairline bg-surface-2/40"
        )}
      >
        {cards.map((p) => (
          <DraggableCard key={p.id} p={p} />
        ))}
        {cards.length === 0 && (
          <div className="grid flex-1 place-items-center py-6 text-center text-xs text-faint">
            Drop here
          </div>
        )}
      </div>
    </div>
  );
}

export function Kanban({ projects }: { projects: Card[] }) {
  const [cards, setCards] = useState(projects);
  const [active, setActive] = useState<Card | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function onStart(e: DragStartEvent) {
    setActive(cards.find((c) => c.id === e.active.id) ?? null);
  }

  function onEnd(e: DragEndEvent) {
    setActive(null);
    const over = e.over?.id as Status | undefined;
    if (!over) return;
    const id = e.active.id as string;
    const card = cards.find((c) => c.id === id);
    if (!card || card.status === over) return;
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, status: over } : c))); // optimistic
    setStatus(id, over);
  }

  return (
    <DndContext sensors={sensors} onDragStart={onStart} onDragEnd={onEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STATUS_ORDER.map((s) => (
          <Column key={s} status={s} cards={cards.filter((c) => c.status === s)} />
        ))}
      </div>
      <DragOverlay>{active ? <div className="w-[250px]"><CardBody p={active} dragging /></div> : null}</DragOverlay>
    </DndContext>
  );
}
