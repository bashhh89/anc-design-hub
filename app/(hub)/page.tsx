import Link from "next/link";
import { format, isPast, differenceInCalendarDays, formatDistanceToNow } from "date-fns";
import { db } from "@/lib/db";
import { Avatar } from "@/components/pills";
import { PRIORITY_META } from "@/lib/design";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const board = await db.board.findFirst({
    where: { deletedAt: null },
    orderBy: { order: "asc" },
    include: { statuses: { orderBy: { order: "asc" } } },
  });

  const [projects, activity] = await Promise.all([
    db.project.findMany({
      where: { deletedAt: null },
      include: { teamLead: true, statusOption: true },
    }),
    db.activity.findMany({
      orderBy: { createdAt: "desc" },
      take: 7,
      include: { user: true, project: true },
    }),
  ]);

  const statuses = board?.statuses ?? [];
  const doneId = statuses.length ? statuses[statuses.length - 1].id : null; // last status = "complete"
  const isDone = (p: (typeof projects)[number]) => p.statusOptionId === doneId;

  const now = new Date();
  const active = projects.filter((p) => !isDone(p));
  const overdue = active.filter((p) => p.dueDate && isPast(new Date(p.dueDate)));
  const dueWeek = active.filter((p) => {
    if (!p.dueDate) return false;
    const d = differenceInCalendarDays(new Date(p.dueDate), now);
    return d >= 0 && d <= 7;
  });
  const delivered = projects.filter(isDone);

  const byStatus = statuses.map((s) => ({
    ...s,
    count: projects.filter((p) => p.statusOptionId === s.id).length,
  }));
  const noStatus = projects.filter((p) => !p.statusOptionId).length;
  const total = projects.length || 1;

  const attention = [...active]
    .filter((p) => p.dueDate)
    .sort(
      (a, b) =>
        (a.dueDate ? +new Date(a.dueDate) : Infinity) - (b.dueDate ? +new Date(b.dueDate) : Infinity) ||
        PRIORITY_META[b.priority].rank - PRIORITY_META[a.priority].rank
    )
    .slice(0, 6);

  const stats = [
    { label: "Active", value: active.length, tone: "var(--ink)" },
    { label: "Due this week", value: dueWeek.length, tone: "#c9852b" },
    { label: "Overdue", value: overdue.length, tone: "#d24b8f" },
    { label: "Delivered", value: delivered.length, tone: "#2fa36b" },
  ];

  return (
    <div className="mx-auto max-w-5xl animate-fade-up">
      {/* header */}
      <div className="mb-9 flex items-end justify-between">
        <div>
          <h1 className="font-display text-[28px] font-semibold leading-none tracking-tight">Overview</h1>
          <p className="mt-2 text-sm text-muted">Where the design work stands today.</p>
        </div>
        <div className="text-right text-xs font-medium uppercase tracking-[0.14em] text-faint">
          {format(now, "EEEE · MMM d")}
        </div>
      </div>

      {/* metrics — calm, big, no clutter */}
      <div className="mb-10 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-hairline bg-hairline shadow-card sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-surface px-6 py-7">
            <div className="font-display text-[34px] font-semibold leading-none tracking-tight" style={{ color: s.tone }}>
              {s.value}
            </div>
            <div className="mt-2 text-xs font-medium uppercase tracking-wide text-faint">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.55fr_1fr]">
        {/* left column */}
        <div className="space-y-10">
          {/* needs attention */}
          <section>
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="font-display text-sm font-semibold uppercase tracking-[0.12em] text-muted">Needs attention</h2>
              <Link href="/board" className="text-xs font-medium text-accent hover:underline">Open board</Link>
            </div>
            <div className="overflow-hidden rounded-2xl border border-hairline bg-surface shadow-card">
              {attention.length === 0 && (
                <div className="px-5 py-10 text-center text-sm text-faint">Nothing overdue or due soon. Calm waters.</div>
              )}
              {attention.map((p, i) => {
                const due = p.dueDate ? new Date(p.dueDate) : null;
                const over = due && isPast(due);
                const st = p.statusOption;
                return (
                  <Link key={p.id} href={`/projects/${p.id}`}
                    className={`flex items-center gap-4 px-5 py-3.5 transition hover:bg-surface-2 ${i > 0 ? "border-t border-hairline" : ""}`}>
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: st?.color ?? "#d8d6cd" }} />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium tracking-tight">{p.name}</span>
                    {st && (
                      <span className="hidden shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold text-white sm:inline" style={{ background: st.color }}>
                        {st.label}
                      </span>
                    )}
                    {due && (
                      <span className={`w-20 shrink-0 text-right text-xs font-medium tabular-nums ${over ? "text-[#d24b8f]" : "text-muted"}`}>
                        {over ? "Overdue" : format(due, "MMM d")}
                      </span>
                    )}
                    {p.teamLead && <Avatar name={p.teamLead.name} color={p.teamLead.color} size={24} />}
                  </Link>
                );
              })}
            </div>
          </section>

          {/* work by status — one elegant bar */}
          <section>
            <h2 className="mb-4 font-display text-sm font-semibold uppercase tracking-[0.12em] text-muted">Work by status</h2>
            <div className="rounded-2xl border border-hairline bg-surface p-6 shadow-card">
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-surface-2">
                {byStatus.map((s) => s.count > 0 && (
                  <div key={s.id} style={{ width: `${(s.count / total) * 100}%`, background: s.color }} title={`${s.label}: ${s.count}`} />
                ))}
                {noStatus > 0 && <div style={{ width: `${(noStatus / total) * 100}%`, background: "#e0ded6" }} />}
              </div>
              <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2.5">
                {byStatus.map((s) => (
                  <div key={s.id} className="flex items-center gap-2 text-sm">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
                    <span className="text-muted">{s.label}</span>
                    <span className="font-semibold tabular-nums">{s.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* activity rail */}
        <section>
          <h2 className="mb-4 font-display text-sm font-semibold uppercase tracking-[0.12em] text-muted">Recent activity</h2>
          <div className="space-y-1">
            {activity.map((a) => (
              <div key={a.id} className="flex gap-3 rounded-xl px-2 py-2.5 hover:bg-surface-2">
                {a.user && <Avatar name={a.user.name} color={a.user.color} size={26} />}
                <div className="min-w-0 text-sm leading-snug">
                  <span className="font-medium">{a.user?.name ?? "Someone"}</span>{" "}
                  <span className="text-muted">{a.action}</span>
                  {a.project && (
                    <Link href={`/projects/${a.project.id}`} className="block truncate text-xs text-accent hover:underline">
                      {a.project.name}
                    </Link>
                  )}
                  <span className="text-[11px] text-faint">{formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
