import Link from "next/link";
import {
  startOfWeek,
  addDays,
  differenceInCalendarDays,
  format,
  max as dateMax,
  isToday,
} from "date-fns";
import { getProjects } from "@/lib/queries";
import { TYPE_META, STATUS_META } from "@/lib/design";
import { Avatar } from "@/components/pills";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function TimelinePage() {
  const projects = (await getProjects()).filter((p) => p.dueDate);
  const today = new Date();
  const windowStart = startOfWeek(today, { weekStartsOn: 1 });

  const lastDue = projects.length
    ? dateMax(projects.map((p) => new Date(p.dueDate!)))
    : addDays(today, 28);
  const windowEnd = addDays(dateMax([lastDue, addDays(today, 21)]), 4);
  const totalDays = Math.max(differenceInCalendarDays(windowEnd, windowStart), 14);

  const weeks: Date[] = [];
  for (let d = 0; d <= totalDays; d += 7) weeks.push(addDays(windowStart, d));

  const pct = (d: Date) => (differenceInCalendarDays(d, windowStart) / totalDays) * 100;
  const todayPct = pct(today);

  return (
    <div className="animate-fade-up">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Timeline</h1>
        <p className="text-sm text-muted">Start to deadline, across the whole queue.</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-hairline bg-surface shadow-card">
        {/* Week axis */}
        <div className="relative h-9 border-b border-hairline bg-surface-2">
          {weeks.map((w) => (
            <div
              key={w.toISOString()}
              className="absolute top-0 flex h-full items-center border-l border-hairline pl-2 text-[11px] font-medium text-faint"
              style={{ left: `${pct(w)}%` }}
            >
              {format(w, "MMM d")}
            </div>
          ))}
        </div>

        <div className="relative">
          {/* Today marker */}
          {todayPct >= 0 && todayPct <= 100 && (
            <div className="pointer-events-none absolute inset-y-0 z-10 w-px bg-accent/70" style={{ left: `${todayPct}%` }}>
              <span className="absolute -top-0 -translate-x-1/2 rounded-b bg-accent px-1 text-[9px] font-semibold text-white">
                TODAY
              </span>
            </div>
          )}

          {projects
            .sort((a, b) => +new Date(a.dueDate!) - +new Date(b.dueDate!))
            .map((p) => {
              const due = new Date(p.dueDate!);
              const start = dateMax([new Date(p.createdAt), windowStart]);
              const left = Math.max(pct(start), 0);
              const right = pct(due);
              const width = Math.max(right - left, 2.5);
              const color = TYPE_META[p.type].color;
              return (
                <div key={p.id} className="relative flex h-14 items-center border-b border-hairline last:border-0">
                  <div className="absolute left-0 z-20 w-52 truncate bg-gradient-to-r from-surface via-surface to-transparent px-4 text-sm">
                    <Link href={`/projects/${p.id}`} className="font-medium tracking-tight hover:text-accent">
                      {p.name}
                    </Link>
                  </div>
                  <div className="relative ml-52 h-full flex-1">
                    <Link
                      href={`/projects/${p.id}`}
                      className="group absolute top-1/2 flex h-7 -translate-y-1/2 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium text-white shadow-card transition hover:shadow-lift"
                      style={{ left: `${left}%`, width: `${width}%`, background: color, minWidth: 90 }}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-white/90" />
                      <span className="truncate">{STATUS_META[p.status].label}</span>
                      {p.teamLead && (
                        <span className="ml-auto">
                          <Avatar name={p.teamLead.name} color="rgba(255,255,255,0.25)" size={18} />
                        </span>
                      )}
                    </Link>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
