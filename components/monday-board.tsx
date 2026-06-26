"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus, ChevronDown, ChevronRight, MessageSquare, Paperclip, Trash2,
  Settings2, Check, X, ExternalLink, GripVertical,
} from "lucide-react";
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors,
  DragOverlay, type DragStartEvent, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Avatar } from "./pills";
import { cn } from "@/lib/utils";
import { UpdatesPanel } from "./updates-panel";
import * as A from "@/lib/board-actions";

export const PALETTE = [
  "#5a4be0", "#2e7dd1", "#2fa36b", "#c9852b", "#e0794b",
  "#d24b8f", "#7a5af0", "#1aa3a3", "#9b9ba3", "#16161a",
];

type U = { id: string; name: string; color: string; role: string };
type Status = { id: string; label: string; color: string; order: number };
type Item = {
  id: string; name: string; statusOptionId: string | null;
  dueDate: string | null; startDate: string | null; endDate: string | null;
  assignees: { id: string; name: string; color: string }[];
  commentCount: number; fileCount: number;
};
type Group = { id: string; name: string; color: string; collapsed: boolean; items: Item[] };
type Board = { id: string; name: string; color: string; icon: string | null };

const ROW = "grid grid-cols-[26px_minmax(220px,1.6fr)_120px_150px_160px_120px_72px_74px]";

/* ── small primitives ───────────────────────────────── */
function useDismiss(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function h(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);
  return ref;
}
function Pop({ children, onClose, className }: { children: React.ReactNode; onClose: () => void; className?: string }) {
  const ref = useDismiss(onClose);
  return (
    <div ref={ref} className={cn("absolute z-50 mt-1 rounded-xl border border-hairline bg-surface p-1.5 shadow-pop animate-fade-up", className)}>
      {children}
    </div>
  );
}
function ColorPicker({ value, onPick }: { value: string; onPick: (c: string) => void }) {
  return (
    <div className="grid grid-cols-5 gap-1.5 p-1">
      {PALETTE.map((c) => (
        <button key={c} onClick={() => onPick(c)} className="grid h-6 w-6 place-items-center rounded-md" style={{ background: c }}>
          {value === c && <Check size={13} className="text-white" />}
        </button>
      ))}
    </div>
  );
}

/* ── cells ──────────────────────────────────────────── */
function NameCell({ item }: { item: Item }) {
  const [v, setV] = useState(item.name);
  const [, start] = useTransition();
  const router = useRouter();
  useEffect(() => setV(item.name), [item.name]);
  const save = () => {
    if (v.trim() && v !== item.name) start(async () => { await A.renameItem(item.id, v); router.refresh(); });
  };
  return (
    <div className="group/name flex items-center gap-2">
      <input
        value={v} onChange={(e) => setV(e.target.value)} onBlur={save}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        className="w-full truncate bg-transparent text-sm font-medium outline-none focus:rounded-md focus:bg-surface-2 focus:px-1.5 focus:py-0.5"
      />
      <Link href={`/projects/${item.id}`} className="opacity-0 transition group-hover/name:opacity-100" title="Open">
        <ExternalLink size={13} className="text-faint hover:text-accent" />
      </Link>
    </div>
  );
}
function StatusCell({ item, statuses }: { item: Item; statuses: Status[] }) {
  const [open, setOpen] = useState(false);
  const [, start] = useTransition();
  const router = useRouter();
  const cur = statuses.find((s) => s.id === item.statusOptionId);
  const set = (id: string | null) => start(async () => { await A.setItemStatus(item.id, id); router.refresh(); setOpen(false); });
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-7 w-full items-center justify-center rounded-md px-2 text-xs font-semibold text-white transition hover:brightness-105"
        style={{ background: cur?.color ?? "#e9e7e0", color: cur ? "#fff" : "#9b9ba3" }}
      >
        {cur?.label ?? "—"}
      </button>
      {open && (
        <Pop onClose={() => setOpen(false)} className="left-0 w-44">
          {statuses.map((s) => (
            <button key={s.id} onClick={() => set(s.id)}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-medium text-white hover:opacity-90"
              style={{ background: s.color }}>
              {s.label}{s.id === item.statusOptionId && <Check size={12} className="ml-auto" />}
            </button>
          ))}
          <button onClick={() => set(null)} className="mt-1 w-full rounded-lg px-2 py-1 text-left text-xs text-muted hover:bg-surface-2">Clear</button>
        </Pop>
      )}
    </div>
  );
}
function PeopleCell({ item, users }: { item: Item; users: U[] }) {
  const [open, setOpen] = useState(false);
  const [, start] = useTransition();
  const router = useRouter();
  const toggle = (uid: string) => start(async () => { await A.toggleAssignee(item.id, uid); router.refresh(); });
  const assigned = new Set(item.assignees.map((a) => a.id));
  return (
    <div className="relative flex justify-center">
      <button onClick={() => setOpen((o) => !o)} className="flex items-center -space-x-1.5 rounded-full px-1 py-0.5 hover:bg-surface-2">
        {item.assignees.length === 0 && <span className="grid h-6 w-6 place-items-center rounded-full border border-dashed border-hairline text-faint"><Plus size={12} /></span>}
        {item.assignees.slice(0, 3).map((a) => <Avatar key={a.id} name={a.name} color={a.color} size={24} />)}
        {item.assignees.length > 3 && <span className="grid h-6 w-6 place-items-center rounded-full bg-surface-2 text-[10px] font-medium text-muted">+{item.assignees.length - 3}</span>}
      </button>
      {open && (
        <Pop onClose={() => setOpen(false)} className="left-1/2 w-52 -translate-x-1/2">
          <div className="max-h-60 overflow-y-auto">
            {users.map((u) => (
              <button key={u.id} onClick={() => toggle(u.id)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-surface-2">
                <Avatar name={u.name} color={u.color} size={22} />
                <span className="flex-1 truncate text-sm">{u.name}</span>
                {assigned.has(u.id) && <Check size={14} className="text-accent" />}
              </button>
            ))}
          </div>
        </Pop>
      )}
    </div>
  );
}
function DateCell({ value, onSet }: { value: string | null; onSet: (v: string | null) => void }) {
  const d = value ? value.slice(0, 10) : "";
  return (
    <input type="date" value={d} onChange={(e) => onSet(e.target.value || null)}
      className="h-7 w-full rounded-md bg-transparent px-1 text-center text-xs text-muted outline-none hover:bg-surface-2 focus:bg-surface-2" />
  );
}

/* ── status manager ─────────────────────────────────── */
function StatusManager({ boardId, statuses, onClose }: { boardId: string; statuses: Status[]; onClose: () => void }) {
  const [, start] = useTransition();
  const router = useRouter();
  const refresh = () => router.refresh();
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-ink/30 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-hairline bg-surface p-5 shadow-pop">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-base font-semibold tracking-tight">Status labels</h3>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-faint hover:bg-surface-2"><X size={18} /></button>
        </div>
        <div className="space-y-2">
          {statuses.map((s) => (
            <div key={s.id} className="flex items-center gap-2">
              <ColorRow label={s.label} color={s.color}
                onLabel={(l) => start(async () => { await A.updateStatus(s.id, l, s.color); refresh(); })}
                onColor={(c) => start(async () => { await A.updateStatus(s.id, s.label, c); refresh(); })} />
              <button onClick={() => start(async () => { await A.deleteStatus(s.id); refresh(); })}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-faint hover:bg-[#fbe9f2] hover:text-[#9a2c63]" title="Delete (admin)"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
        <button onClick={() => start(async () => { await A.createStatus(boardId, "New label", "#9b9ba3"); refresh(); })}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-hairline px-3 py-1.5 text-xs font-medium text-muted hover:border-accent hover:text-accent">
          <Plus size={14} /> Add label
        </button>
      </div>
    </div>
  );
}
function ColorRow({ label, color, onLabel, onColor }: { label: string; color: string; onLabel: (l: string) => void; onColor: (c: string) => void }) {
  const [v, setV] = useState(label);
  const [pick, setPick] = useState(false);
  return (
    <div className="flex flex-1 items-center gap-2 rounded-lg px-1" style={{ background: `color-mix(in srgb, ${color} 12%, transparent)` }}>
      <div className="relative">
        <button onClick={() => setPick((p) => !p)} className="h-6 w-6 rounded-md" style={{ background: color }} />
        {pick && <Pop onClose={() => setPick(false)} className="left-0"><ColorPicker value={color} onPick={(c) => { onColor(c); setPick(false); }} /></Pop>}
      </div>
      <input value={v} onChange={(e) => setV(e.target.value)} onBlur={() => v !== label && onLabel(v)}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        className="h-8 flex-1 bg-transparent text-sm font-medium outline-none" />
    </div>
  );
}

/* ── sortable item row ──────────────────────────────── */
function ItemRow({ item, group, statuses, users, isAdmin, onSetDate, onOpenUpdates, onDelete }: {
  item: Item; group: Group; statuses: Status[]; users: U[]; isAdmin: boolean;
  onSetDate: (item: Item, f: "dueDate" | "startDate" | "endDate", v: string | null) => void;
  onOpenUpdates: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id, data: { type: "item", groupId: group.id },
  });
  const [confirm, setConfirm] = useState(false);
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, boxShadow: `inset 4px 0 0 ${group.color}` }}
      className={cn("group/row relative", ROW, "items-center border-b border-hairline last:border-0 hover:bg-surface-2/50", isDragging && "z-10 bg-surface opacity-80 shadow-lift")}
    >
      <button {...attributes} {...listeners} className="flex h-full cursor-grab items-center justify-center text-faint hover:text-muted active:cursor-grabbing" title="Drag to reorder">
        <GripVertical size={14} />
      </button>
      <div className="px-1 py-1.5"><NameCell item={item} /></div>
      <div className="px-2 py-1.5"><PeopleCell item={item} users={users} /></div>
      <div className="px-2 py-1.5"><StatusCell item={item} statuses={statuses} /></div>
      <div className="flex items-center px-1 py-1.5">
        <DateCell value={item.startDate} onSet={(v) => onSetDate(item, "startDate", v)} />
        <span className="text-faint">–</span>
        <DateCell value={item.endDate} onSet={(v) => onSetDate(item, "endDate", v)} />
      </div>
      <div className="px-2 py-1.5"><DateCell value={item.dueDate} onSet={(v) => onSetDate(item, "dueDate", v)} /></div>
      <Link href={`/projects/${item.id}`} className="flex items-center justify-center gap-1 px-2 py-1.5 text-xs text-muted hover:text-accent"><Paperclip size={13} />{item.fileCount}</Link>
      <button onClick={() => onOpenUpdates(item.id)} className="flex items-center justify-center gap-1 px-2 py-1.5 text-xs text-muted hover:text-accent" title="Open updates"><MessageSquare size={13} />{item.commentCount}</button>
      {isAdmin && (
        <button
          onClick={() => { if (!confirm) { setConfirm(true); setTimeout(() => setConfirm(false), 2500); return; } onDelete(item.id); }}
          className={cn(
            "absolute right-1.5 top-1/2 grid h-6 -translate-y-1/2 place-items-center rounded-md text-xs font-medium transition",
            confirm ? "w-auto px-2 bg-[#fbe9f2] text-[#9a2c63]" : "w-6 text-faint opacity-0 group-hover/row:opacity-100 hover:bg-[#fbe9f2] hover:text-[#9a2c63]"
          )}
          title="Delete item (admin)"
        >
          {confirm ? "Delete?" : <Trash2 size={13} />}
        </button>
      )}
    </div>
  );
}

/* ── sortable group ─────────────────────────────────── */
function GroupSection({ group, board, statuses, users, isAdmin, onOpenUpdates, onDelete }: {
  group: Group; board: Board; statuses: Status[]; users: U[]; isAdmin: boolean;
  onOpenUpdates: (id: string) => void; onDelete: (id: string) => void;
}) {
  const [, start] = useTransition();
  const router = useRouter();
  const [name, setName] = useState(group.name);
  const [pick, setPick] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newItem, setNewItem] = useState("");
  const collapsed = group.collapsed;
  useEffect(() => setName(group.name), [group.name]);

  const sortable = useSortable({ id: "g:" + group.id, data: { type: "group" } });
  const setDate = (item: Item, field: "dueDate" | "startDate" | "endDate", v: string | null) =>
    start(async () => { await A.setItemDate(item.id, field, v); router.refresh(); });

  return (
    <div ref={sortable.setNodeRef} style={{ transform: CSS.Transform.toString(sortable.transform), transition: sortable.transition }} className="group/sec mb-6">
      <div className="mb-1.5 flex items-center gap-2">
        <button {...sortable.attributes} {...sortable.listeners} className="cursor-grab text-faint hover:text-muted active:cursor-grabbing" title="Drag group">
          <GripVertical size={16} />
        </button>
        <button onClick={() => start(async () => { await A.toggleGroupCollapse(group.id, !collapsed); router.refresh(); })} className="text-faint hover:text-ink">
          {collapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
        </button>
        <div className="relative">
          <button onClick={() => setPick((p) => !p)} className="h-3 w-3 rounded-full" style={{ background: group.color }} />
          {pick && <Pop onClose={() => setPick(false)} className="left-0"><ColorPicker value={group.color} onPick={(c) => { start(async () => { await A.setGroupColor(group.id, c); router.refresh(); }); setPick(false); }} /></Pop>}
        </div>
        <input value={name} onChange={(e) => setName(e.target.value)} onBlur={() => name !== group.name && start(async () => { await A.renameGroup(group.id, name); router.refresh(); })}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          className="bg-transparent font-display text-sm font-semibold tracking-tight outline-none focus:rounded-md focus:bg-surface-2 focus:px-1.5"
          style={{ color: group.color }} />
        <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium text-muted">{group.items.length}</span>
        {isAdmin && (
          <button onClick={() => start(async () => { await A.deleteGroup(group.id); router.refresh(); })} className="ml-1 text-faint opacity-0 transition hover:text-[#9a2c63] group-hover/sec:opacity-100" title="Delete group">
            <Trash2 size={13} />
          </button>
        )}
      </div>

      {!collapsed && (
        <div className="overflow-x-auto rounded-xl border border-hairline bg-surface shadow-card">
         <div className="min-w-[880px]">
          <div className={cn(ROW, "items-center border-b border-hairline bg-surface-2 text-[11px] font-semibold uppercase tracking-wide text-faint")} style={{ boxShadow: `inset 4px 0 0 ${group.color}` }}>
            <div />
            <div className="px-1 py-2">Item</div>
            <div className="px-2 py-2 text-center">People</div>
            <div className="px-2 py-2 text-center">Status</div>
            <div className="px-2 py-2 text-center">Timeline</div>
            <div className="px-2 py-2 text-center">Date</div>
            <div className="px-2 py-2 text-center">Files</div>
            <div className="px-2 py-2 text-center">Updates</div>
          </div>
          <SortableContext items={group.items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            {group.items.map((item) => (
              <ItemRow key={item.id} item={item} group={group} statuses={statuses} users={users} isAdmin={isAdmin} onSetDate={setDate} onOpenUpdates={onOpenUpdates} onDelete={onDelete} />
            ))}
          </SortableContext>
          <div className="px-3 py-1.5" style={{ boxShadow: `inset 4px 0 0 ${group.color}` }}>
            {adding ? (
              <input autoFocus value={newItem} onChange={(e) => setNewItem(e.target.value)}
                onBlur={() => { if (newItem.trim()) start(async () => { await A.createItem(board.id, group.id, newItem); setNewItem(""); router.refresh(); }); setAdding(false); }}
                onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                placeholder="Item name…" className="w-full bg-transparent text-sm outline-none placeholder:text-faint" />
            ) : (
              <button onClick={() => setAdding(true)} className="flex items-center gap-1.5 text-sm text-faint hover:text-accent"><Plus size={15} /> Add item</button>
            )}
          </div>
         </div>
        </div>
      )}
    </div>
  );
}

/* ── main ───────────────────────────────────────────── */
export function MondayBoard({ board, boards, groups, statuses, users, isAdmin }: {
  board: Board; boards: Board[]; groups: Group[]; statuses: Status[]; users: U[]; isAdmin: boolean;
}) {
  const [, start] = useTransition();
  const router = useRouter();
  const [mgr, setMgr] = useState(false);
  const [bName, setBName] = useState(board.name);
  const [addingBoard, setAddingBoard] = useState(false);
  const [newBoard, setNewBoard] = useState("");
  const [openItem, setOpenItem] = useState<string | null>(null);
  const [cols, setCols] = useState<Group[]>(groups);
  useEffect(() => { setCols(groups); setBName(board.name); }, [groups, board.name, board.id]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const createBoardNow = () => {
    const n = newBoard.trim();
    setAddingBoard(false); setNewBoard("");
    if (n) start(async () => { const id = await A.createBoard(n); router.push(`/board?b=${id}`); router.refresh(); });
  };

  const findGroupOfItem = (itemId: string) => cols.find((g) => g.items.some((i) => i.id === itemId));

  const deleteItem = (itemId: string) => {
    setCols((prev) => prev.map((g) => ({ ...g, items: g.items.filter((i) => i.id !== itemId) })));
    A.deleteItem(itemId);
    if (openItem === itemId) setOpenItem(null);
  };

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;

    // group reorder — map an "over item" back to its group so it works anywhere
    if (activeId.startsWith("g:")) {
      const from = cols.findIndex((g) => "g:" + g.id === activeId);
      let to = cols.findIndex((g) => "g:" + g.id === overId);
      if (to < 0) {
        const og = findGroupOfItem(overId);
        if (og) to = cols.findIndex((g) => g.id === og.id);
      }
      if (from < 0 || to < 0 || from === to) return;
      const next = arrayMove(cols, from, to);
      setCols(next);
      A.reorderGroups(next.map((g) => g.id));
      return;
    }

    // item reorder / move
    const srcGroup = findGroupOfItem(activeId);
    if (!srcGroup) return;
    let destGroup: Group | undefined;
    let destIndex = 0;
    if (overId.startsWith("g:")) {
      destGroup = cols.find((g) => "g:" + g.id === overId);
      destIndex = destGroup ? destGroup.items.length : 0;
    } else {
      destGroup = findGroupOfItem(overId);
      destIndex = destGroup ? destGroup.items.findIndex((i) => i.id === overId) : 0;
    }
    if (!destGroup) return;

    const next = cols.map((g) => ({ ...g, items: [...g.items] }));
    const sg = next.find((g) => g.id === srcGroup.id)!;
    const dg = next.find((g) => g.id === destGroup!.id)!;
    const moved = sg.items.find((i) => i.id === activeId)!;
    sg.items = sg.items.filter((i) => i.id !== activeId);
    const insertAt = sg === dg && destIndex > sg.items.length ? sg.items.length : destIndex;
    dg.items.splice(insertAt, 0, moved);
    setCols(next);
    A.reorderItems(dg.id, dg.items.map((i) => i.id));
  }

  return (
    <div className="animate-fade-up">
      {/* board tabs */}
      <div className="mb-5 flex items-center gap-1.5 border-b border-hairline pb-2">
        {boards.map((b) => (
          <Link key={b.id} href={`/board?b=${b.id}`}
            className={cn("flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition",
              b.id === board.id ? "bg-accent-soft text-accent-ink" : "text-muted hover:bg-surface-2")}>
            <span>{b.icon ?? "▦"}</span>{b.name}
          </Link>
        ))}
        {addingBoard ? (
          <input autoFocus value={newBoard} onChange={(e) => setNewBoard(e.target.value)} onBlur={createBoardNow}
            onKeyDown={(e) => { if (e.key === "Enter") createBoardNow(); if (e.key === "Escape") { setAddingBoard(false); setNewBoard(""); } }}
            placeholder="Board name…" className="h-8 w-44 rounded-lg border border-hairline bg-surface-2 px-2.5 text-sm outline-none transition focus:border-accent focus:bg-surface focus:ring-2 focus:ring-accent-soft" />
        ) : (
          <button onClick={() => setAddingBoard(true)} className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-medium text-faint hover:bg-surface-2 hover:text-ink"><Plus size={15} /> Board</button>
        )}
      </div>

      {/* board header */}
      <div className="mb-5 flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-xl text-lg" style={{ background: `color-mix(in srgb, ${board.color} 14%, transparent)` }}>{board.icon ?? "▦"}</span>
        <input value={bName} onChange={(e) => setBName(e.target.value)} onBlur={() => bName !== board.name && start(async () => { await A.renameBoard(board.id, bName); router.refresh(); })}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          className="bg-transparent font-display text-2xl font-semibold tracking-tight outline-none focus:rounded-lg focus:bg-surface-2 focus:px-2" />
        <button onClick={() => setMgr(true)} className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-hairline px-3 py-1.5 text-xs font-medium text-muted hover:border-accent hover:text-accent">
          <Settings2 size={14} /> Statuses
        </button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={cols.map((g) => "g:" + g.id)} strategy={verticalListSortingStrategy}>
          {cols.map((g) => (
            <GroupSection key={g.id} group={g} board={board} statuses={statuses} users={users} isAdmin={isAdmin} onOpenUpdates={setOpenItem} onDelete={deleteItem} />
          ))}
        </SortableContext>
      </DndContext>

      <button onClick={() => start(async () => { await A.createGroup(board.id, "New group"); router.refresh(); })}
        className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-hairline px-4 py-2 text-sm font-medium text-muted hover:border-accent hover:text-accent">
        <Plus size={16} /> Add group
      </button>

      {mgr && <StatusManager boardId={board.id} statuses={statuses} onClose={() => setMgr(false)} />}
      {openItem && <UpdatesPanel itemId={openItem} onClose={() => setOpenItem(null)} />}
    </div>
  );
}
