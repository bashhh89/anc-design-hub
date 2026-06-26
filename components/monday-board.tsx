"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus, ChevronDown, ChevronRight, MessageSquare, Paperclip, Trash2,
  Settings2, Check, X, ExternalLink, Calendar as CalIcon,
} from "lucide-react";
import { Avatar } from "./pills";
import { cn, initials } from "@/lib/utils";
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

/* ── group ──────────────────────────────────────────── */
function GroupSection({ group, board, statuses, users, isAdmin }: { group: Group; board: Board; statuses: Status[]; users: U[]; isAdmin: boolean }) {
  const [, start] = useTransition();
  const router = useRouter();
  const [name, setName] = useState(group.name);
  const [pick, setPick] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newItem, setNewItem] = useState("");
  const collapsed = group.collapsed;

  const setDate = (item: Item, field: "dueDate" | "startDate" | "endDate", v: string | null) =>
    start(async () => { await A.setItemDate(item.id, field, v); router.refresh(); });

  return (
    <div className="mb-6">
      <div className="mb-1.5 flex items-center gap-2">
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
          <button onClick={() => start(async () => { await A.deleteGroup(group.id); router.refresh(); })} className="ml-1 text-faint opacity-0 transition hover:text-[#9a2c63] group-hover:opacity-100" title="Delete group">
            <Trash2 size={13} />
          </button>
        )}
      </div>

      {!collapsed && (
        <div className="overflow-x-auto rounded-xl border border-hairline bg-surface shadow-card">
         <div className="min-w-[860px]">
          {/* header */}
          <div className="grid grid-cols-[minmax(240px,1.6fr)_120px_150px_160px_120px_72px_74px] items-center border-b border-hairline bg-surface-2 text-[11px] font-semibold uppercase tracking-wide text-faint" style={{ boxShadow: `inset 4px 0 0 ${group.color}` }}>
            <div className="px-3 py-2">Item</div>
            <div className="px-2 py-2 text-center">People</div>
            <div className="px-2 py-2 text-center">Status</div>
            <div className="px-2 py-2 text-center">Timeline</div>
            <div className="px-2 py-2 text-center">Date</div>
            <div className="px-2 py-2 text-center">Files</div>
            <div className="px-2 py-2 text-center">Updates</div>
          </div>
          {/* rows */}
          {group.items.map((item) => (
            <div key={item.id} className="grid grid-cols-[minmax(240px,1.6fr)_120px_150px_160px_120px_72px_74px] items-center border-b border-hairline last:border-0 hover:bg-surface-2/50" style={{ boxShadow: `inset 4px 0 0 ${group.color}` }}>
              <div className="px-3 py-1.5"><NameCell item={item} /></div>
              <div className="px-2 py-1.5"><PeopleCell item={item} users={users} /></div>
              <div className="px-2 py-1.5"><StatusCell item={item} statuses={statuses} /></div>
              <div className="flex items-center px-1 py-1.5">
                <DateCell value={item.startDate} onSet={(v) => setDate(item, "startDate", v)} />
                <span className="text-faint">–</span>
                <DateCell value={item.endDate} onSet={(v) => setDate(item, "endDate", v)} />
              </div>
              <div className="px-2 py-1.5"><DateCell value={item.dueDate} onSet={(v) => setDate(item, "dueDate", v)} /></div>
              <Link href={`/projects/${item.id}`} className="flex items-center justify-center gap-1 px-2 py-1.5 text-xs text-muted hover:text-accent"><Paperclip size={13} />{item.fileCount}</Link>
              <Link href={`/projects/${item.id}`} className="flex items-center justify-center gap-1 px-2 py-1.5 text-xs text-muted hover:text-accent"><MessageSquare size={13} />{item.commentCount}</Link>
            </div>
          ))}
          {/* add item */}
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
        <button onClick={() => { const n = prompt("New board name"); if (n) start(async () => { const id = await A.createBoard(n); router.push(`/board?b=${id}`); router.refresh(); }); }}
          className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-medium text-faint hover:bg-surface-2 hover:text-ink"><Plus size={15} /> Board</button>
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

      {groups.map((g) => (
        <div key={g.id} className="group">
          <GroupSection group={g} board={board} statuses={statuses} users={users} isAdmin={isAdmin} />
        </div>
      ))}

      <button onClick={() => start(async () => { await A.createGroup(board.id, "New group"); router.refresh(); })}
        className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-hairline px-4 py-2 text-sm font-medium text-muted hover:border-accent hover:text-accent">
        <Plus size={16} /> Add group
      </button>

      {mgr && <StatusManager boardId={board.id} statuses={statuses} onClose={() => setMgr(false)} />}
    </div>
  );
}
