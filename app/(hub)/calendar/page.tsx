import Link from "next/link";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  isToday,
} from "date-fns";
import { getProjects } from "@/lib/queries";
import { STATUS_META, TYPE_META } from "@/lib/design";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const projects = await getProjects();
  const now = new Date();
  const gridStart = startOfWeek(startOfMonth(now), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(now), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const dueByDay = (d: Date) =>
    projects.filter((p) => p.dueDate && isSameDay(new Date(p.dueDate), d));

  return (
    <div className="animate-fade-up">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Calendar</h1>
          <p className="text-sm text-muted">Deadlines at a glance.</p>
        </div>
        <div className="font-display text-lg font-semibold tracking-tight text-muted">
          {format(now, "MMMM yyyy")}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-hairline bg-surface shadow-card">
        <div className="grid grid-cols-7 border-b border-hairline bg-surface-2 text-xs font-semibold uppercase tracking-wide text-faint">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d} className="px-3 py-2.5">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((d) => {
            const items = dueByDay(d);
            const muted = !isSameMonth(d, now);
            return (
              <div
                key={d.toISOString()}
                className={cn(
                  "min-h-[112px] border-b border-r border-hairline p-2",
                  muted && "bg-surface-2/40"
                )}
              >
                <div
                  className={cn(
                    "mb-1.5 inline-grid h-6 w-6 place-items-center rounded-full text-xs font-medium",
                    isToday(d) ? "bg-accent text-white" : muted ? "text-faint" : "text-muted"
                  )}
                >
                  {format(d, "d")}
                </div>
                <div className="space-y-1">
                  {items.slice(0, 3).map((p) => (
                    <Link
                      key={p.id}
                      href={`/projects/${p.id}`}
                      className="block truncate rounded-md px-1.5 py-1 text-[11px] font-medium text-ink hover:opacity-80"
                      style={{ background: STATUS_META[p.status].tint, color: STATUS_META[p.status].ink }}
                    >
                      <span
                        className="mr-1 inline-block h-1.5 w-1.5 rounded-full align-middle"
                        style={{ background: TYPE_META[p.type].color }}
                      />
                      {p.name}
                    </Link>
                  ))}
                  {items.length > 3 && (
                    <div className="px-1.5 text-[11px] text-faint">+{items.length - 3} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
