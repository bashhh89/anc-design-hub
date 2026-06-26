"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send, GitCommitHorizontal, Paperclip, Archive } from "lucide-react";
import type { Status } from "@prisma/client";
import { STATUS_ORDER, STATUS_META } from "@/lib/design";
import {
  setStatus,
  addComment,
  addRevision,
  addAttachment,
  softDeleteProject,
} from "@/lib/actions";

export function StatusSelect({ id, status }: { id: string; status: Status }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <select
      defaultValue={status}
      disabled={pending}
      onChange={(e) =>
        start(async () => {
          await setStatus(id, e.target.value as Status);
          router.refresh();
        })
      }
      className="h-9 cursor-pointer rounded-xl border border-hairline bg-surface px-3 text-sm font-medium outline-none transition focus:border-accent focus:ring-2 focus:ring-accent-soft"
    >
      {STATUS_ORDER.map((s) => (
        <option key={s} value={s}>{STATUS_META[s].label}</option>
      ))}
    </select>
  );
}

export function AddComment({ id }: { id: string }) {
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!body.trim()) return;
        start(async () => {
          await addComment(id, body);
          setBody("");
          router.refresh();
        });
      }}
      className="flex items-end gap-2"
    >
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={1}
        placeholder="Write a comment…"
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) (e.target as HTMLTextAreaElement).form?.requestSubmit();
        }}
        className="min-h-[40px] flex-1 resize-none rounded-xl border border-hairline bg-surface-2 px-3 py-2.5 text-sm outline-none transition focus:border-accent focus:bg-surface focus:ring-2 focus:ring-accent-soft"
      />
      <button
        disabled={pending || !body.trim()}
        className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent text-white transition hover:bg-accent-hover disabled:opacity-50"
      >
        <Send size={16} />
      </button>
    </form>
  );
}

export function AddRevision({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();

  if (!open)
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-hairline px-2.5 py-1.5 text-xs font-medium text-muted transition hover:border-accent hover:text-accent"
      >
        <GitCommitHorizontal size={14} /> Log revision
      </button>
    );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!label.trim()) return;
        start(async () => {
          await addRevision(id, label, note);
          setLabel(""); setNote(""); setOpen(false);
          router.refresh();
        });
      }}
      className="space-y-2 rounded-xl border border-hairline bg-surface-2 p-3"
    >
      <input
        value={label} onChange={(e) => setLabel(e.target.value)} autoFocus
        placeholder="Revision label — e.g. Rev C"
        className="h-9 w-full rounded-lg border border-hairline bg-surface px-3 text-sm outline-none focus:border-accent"
      />
      <textarea
        value={note} onChange={(e) => setNote(e.target.value)} rows={2}
        placeholder="What changed / who asked?"
        className="w-full rounded-lg border border-hairline bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
      />
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted hover:bg-surface">
          Cancel
        </button>
        <button disabled={pending || !label.trim()} className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover disabled:opacity-50">
          Save revision
        </button>
      </div>
    </form>
  );
}

export function AddAttachment({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();

  if (!open)
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-hairline px-2.5 py-1.5 text-xs font-medium text-muted transition hover:border-accent hover:text-accent"
      >
        <Paperclip size={14} /> Add link
      </button>
    );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim() || !url.trim()) return;
        start(async () => {
          await addAttachment(id, name, url);
          setName(""); setUrl(""); setOpen(false);
          router.refresh();
        });
      }}
      className="flex flex-wrap items-center gap-2 rounded-xl border border-hairline bg-surface-2 p-3"
    >
      <input value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="File / link name"
        className="h-9 flex-1 rounded-lg border border-hairline bg-surface px-3 text-sm outline-none focus:border-accent" />
      <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…"
        className="h-9 flex-[2] rounded-lg border border-hairline bg-surface px-3 text-sm outline-none focus:border-accent" />
      <button disabled={pending} className="rounded-lg bg-accent px-3 py-2 text-xs font-medium text-white hover:bg-accent-hover disabled:opacity-50">
        Add
      </button>
    </form>
  );
}

export function ArchiveButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const router = useRouter();
  return (
    <button
      onClick={() => {
        if (!confirm) { setConfirm(true); return; }
        start(async () => {
          await softDeleteProject(id);
          router.push("/board");
          router.refresh();
        });
      }}
      disabled={pending}
      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted transition hover:bg-[#fbe9f2] hover:text-[#9a2c63]"
    >
      <Archive size={14} /> {confirm ? "Click again to archive" : "Archive"}
    </button>
  );
}
