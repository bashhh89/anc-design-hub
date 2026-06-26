"use client";

import { useEffect, useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { X, Send, ExternalLink, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Avatar } from "./pills";
import { getItemUpdates, addUpdate } from "@/lib/board-actions";

type Update = { id: string; body: string; createdAt: string; author: { name: string; color: string } };

export function UpdatesPanel({ itemId, onClose }: { itemId: string; onClose: () => void }) {
  const [data, setData] = useState<{ name: string; comments: Update[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();

  const load = () => {
    getItemUpdates(itemId).then((d) => {
      if (d) setData({ name: d.name, comments: d.comments });
      setLoading(false);
    });
  };
  useEffect(() => { setLoading(true); load(); /* eslint-disable-next-line */ }, [itemId]);
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  const post = () => {
    if (!body.trim()) return;
    start(async () => {
      await addUpdate(itemId, body);
      setBody("");
      load();
      router.refresh();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-ink/20 backdrop-blur-[2px]" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-md animate-[slidein_.25s_cubic-bezier(0.16,1,0.3,1)] flex-col border-l border-hairline bg-surface shadow-pop">
        <style>{`@keyframes slidein{from{transform:translateX(24px);opacity:.4}to{transform:translateX(0);opacity:1}}`}</style>
        {/* header */}
        <div className="flex items-start justify-between gap-3 border-b border-hairline px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-accent-ink">
              <MessageSquare size={13} /> Updates
            </div>
            <h2 className="mt-1 truncate font-display text-base font-semibold tracking-tight">
              {data?.name ?? "…"}
            </h2>
          </div>
          <div className="flex items-center gap-1">
            <Link href={`/projects/${itemId}`} title="Open full project"
              className="grid h-8 w-8 place-items-center rounded-lg text-faint hover:bg-surface-2 hover:text-ink">
              <ExternalLink size={16} />
            </Link>
            <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-faint hover:bg-surface-2 hover:text-ink">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* composer */}
        <div className="border-b border-hairline px-5 py-3">
          <div className="flex items-end gap-2">
            <textarea
              value={body} onChange={(e) => setBody(e.target.value)} rows={1}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) post(); }}
              placeholder="Write an update…"
              className="min-h-[40px] flex-1 resize-none rounded-xl border border-hairline bg-surface-2 px-3 py-2.5 text-sm outline-none transition focus:border-accent focus:bg-surface focus:ring-2 focus:ring-accent-soft"
            />
            <button onClick={post} disabled={pending || !body.trim()}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent text-white transition hover:bg-accent-hover disabled:opacity-50">
              <Send size={16} />
            </button>
          </div>
        </div>

        {/* thread */}
        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {loading && <p className="text-sm text-faint">Loading…</p>}
          {!loading && data?.comments.length === 0 && (
            <div className="grid place-items-center py-12 text-center text-sm text-faint">
              No updates yet. Post the first one above.
            </div>
          )}
          {data?.comments.map((c) => (
            <div key={c.id} className="flex gap-3">
              <Avatar name={c.author.name} color={c.author.color} size={30} />
              <div className="min-w-0 flex-1 rounded-xl rounded-tl-sm bg-surface-2 px-3.5 py-2.5">
                <div className="mb-0.5 flex items-baseline gap-2">
                  <span className="text-sm font-medium">{c.author.name}</span>
                  <span className="text-[11px] text-faint">
                    {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-sm text-ink/90">{c.body}</p>
              </div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
