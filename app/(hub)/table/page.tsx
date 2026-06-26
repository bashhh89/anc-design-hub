import Link from "next/link";
import { format, isPast } from "date-fns";
import { getProjects } from "@/lib/queries";
import { StatusPill, PriorityPill, TypeChip, Avatar } from "@/components/pills";
import { CATEGORY_META } from "@/lib/design";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function TablePage() {
  const projects = await getProjects();
  return (
    <div className="animate-fade-up">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Table</h1>
        <p className="text-sm text-muted">Every project, dense and scannable.</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-hairline bg-surface shadow-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-hairline text-left text-xs font-semibold uppercase tracking-wide text-faint">
              <th className="px-4 py-3 font-semibold">Project</th>
              <th className="px-4 py-3 font-semibold">Type</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Priority</th>
              <th className="px-4 py-3 font-semibold">Lead</th>
              <th className="px-4 py-3 font-semibold">Category</th>
              <th className="px-4 py-3 font-semibold">Due</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => {
              const due = p.dueDate ? new Date(p.dueDate) : null;
              const overdue = due && isPast(due) && p.status !== "DELIVERED";
              return (
                <tr key={p.id} className="group border-b border-hairline last:border-0 transition-colors hover:bg-surface-2">
                  <td className="px-4 py-3">
                    <Link href={`/projects/${p.id}`} className="font-medium tracking-tight group-hover:text-accent">
                      {p.name}
                    </Link>
                    {p.crmOpportunityName && (
                      <div className="text-xs text-faint">{p.crmOpportunityName}</div>
                    )}
                  </td>
                  <td className="px-4 py-3"><TypeChip type={p.type} /></td>
                  <td className="px-4 py-3"><StatusPill status={p.status} /></td>
                  <td className="px-4 py-3"><PriorityPill priority={p.priority} /></td>
                  <td className="px-4 py-3">
                    {p.teamLead && (
                      <span className="flex items-center gap-2">
                        <Avatar name={p.teamLead.name} color={p.teamLead.color} size={22} />
                        <span className="text-muted">{p.teamLead.name}</span>
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted">{CATEGORY_META[p.category].label}</td>
                  <td className={cn("px-4 py-3 tabular-nums", overdue ? "font-medium text-[#d24b8f]" : "text-muted")}>
                    {due ? format(due, "MMM d") : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
