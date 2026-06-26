import Link from "next/link";
import { ArrowUpRight, Flame, Clock3, CheckCircle2, Layers } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { getProjects, getStats } from "@/lib/queries";
import { db } from "@/lib/db";
import { ProjectCard } from "@/components/project-card";
import { STATUS_META, STATUS_ORDER, PRIORITY_META } from "@/lib/design";
import { Avatar } from "@/components/pills";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const [projects, [total, active, urgent, delivered], activity] = await Promise.all([
    getProjects(),
    getStats(),
    db.activity.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { user: true, project: true },
    }),
  ]);

  const attention = [...projects]
    .filter((p) => p.status !== "DELIVERED")
    .sort(
      (a, b) =>
        PRIORITY_META[b.priority].rank - PRIORITY_META[a.priority].rank ||
        (a.dueDate ? +new Date(a.dueDate) : Infinity) - (b.dueDate ? +new Date(b.dueDate) : Infinity)
    )
    .slice(0, 4);

  const byStatus = STATUS_ORDER.map((s) => ({
    status: s,
    count: projects.filter((p) => p.status === s).length,
  }));

  const kpis = [
    { label: "Active projects", value: total, icon: Layers, tint: "var(--accent)" },
    { label: "In flight", value: active, icon: Clock3, tint: "#2e7dd1" },
    { label: "Urgent", value: urgent, icon: Flame, tint: "#d24b8f" },
    { label: "Delivered", value: delivered, icon: CheckCircle2, tint: "#2fa36b" },
  ];

  return (
    <div className="mx-auto max-w-6xl animate-fade-up space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted">Every design request, from first ask to delivered.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-2xl border border-hairline bg-surface p-5 shadow-card">
            <div className="flex items-center justify-between">
              <span
                className="grid h-9 w-9 place-items-center rounded-xl"
                style={{ background: `color-mix(in srgb, ${k.tint} 12%, transparent)`, color: k.tint }}
              >
                <k.icon size={18} />
              </span>
            </div>
            <div className="mt-3 font-display text-3xl font-semibold tracking-tight">{k.value}</div>
            <div className="text-xs font-medium text-muted">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Needs attention */}
        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-muted">
              Needs attention
            </h2>
            <Link href="/board" className="flex items-center gap-1 text-xs font-medium text-accent hover:underline">
              Open board <ArrowUpRight size={13} />
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {attention.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>

          {/* Pipeline bar */}
          <div className="mt-6 rounded-2xl border border-hairline bg-surface p-5 shadow-card">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted">Pipeline</h3>
            <div className="space-y-2.5">
              {byStatus.map(({ status, count }) => {
                const m = STATUS_META[status];
                const pct = total ? (count / total) * 100 : 0;
                return (
                  <div key={status} className="flex items-center gap-3">
                    <span className="w-24 shrink-0 text-xs font-medium text-muted">{m.label}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: m.dot }} />
                    </div>
                    <span className="w-5 text-right text-xs font-semibold tabular-nums">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Activity */}
        <div>
          <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wide text-muted">
            Activity
          </h2>
          <div className="rounded-2xl border border-hairline bg-surface p-2 shadow-card">
            {activity.map((a) => (
              <div key={a.id} className="flex gap-3 rounded-xl px-3 py-2.5 hover:bg-surface-2">
                {a.user && <Avatar name={a.user.name} color={a.user.color} size={26} />}
                <div className="min-w-0 text-sm">
                  <span className="font-medium">{a.user?.name ?? "Someone"}</span>{" "}
                  <span className="text-muted">{a.action}</span>
                  {a.project && (
                    <Link href={`/projects/${a.project.id}`} className="block truncate text-xs text-accent hover:underline">
                      {a.project.name}
                    </Link>
                  )}
                  <span className="text-[11px] text-faint">
                    {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
