import Link from "next/link";
import { MessageSquare, GitCommitHorizontal, Paperclip, Link2 } from "lucide-react";
import { format, isPast, differenceInCalendarDays } from "date-fns";
import { StatusPill, PriorityPill, TypeChip, Avatar } from "./pills";
import { TYPE_META } from "@/lib/design";
import type { ProjectWithRels } from "@/lib/queries";
import { cn } from "@/lib/utils";

export function ProjectCard({
  project,
  compact = false,
}: {
  project: ProjectWithRels;
  compact?: boolean;
}) {
  const edge = TYPE_META[project.type].color;
  const due = project.dueDate ? new Date(project.dueDate) : null;
  const overdue = due && isPast(due) && project.status !== "DELIVERED";
  const dueIn = due ? differenceInCalendarDays(due, new Date()) : null;

  return (
    <Link
      href={`/projects/${project.id}`}
      className="group relative block overflow-hidden rounded-xl border border-hairline bg-surface shadow-card transition hover:-translate-y-0.5 hover:shadow-lift"
    >
      <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: edge }} />
      <div className="p-3.5 pl-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <TypeChip type={project.type} />
          <PriorityPill priority={project.priority} />
        </div>

        <h3 className="mb-1 line-clamp-2 font-display text-[15px] font-semibold leading-snug tracking-tight text-ink">
          {project.name}
        </h3>

        {!compact && project.crmOpportunityName && (
          <div className="mb-2 inline-flex items-center gap-1 text-xs text-muted">
            <Link2 size={12} className="text-faint" />
            <span className="truncate">{project.crmOpportunityName}</span>
          </div>
        )}

        <div className="mt-2.5 flex items-center justify-between">
          <StatusPill status={project.status} />
          {project.teamLead && (
            <Avatar name={project.teamLead.name} color={project.teamLead.color} size={22} />
          )}
        </div>

        <div className="mt-3 flex items-center gap-3 border-t border-hairline pt-2.5 text-xs text-faint">
          {due && (
            <span className={cn("font-medium", overdue ? "text-[#d24b8f]" : "text-muted")}>
              {overdue
                ? `Overdue ${format(due, "MMM d")}`
                : dueIn === 0
                ? "Due today"
                : dueIn && dueIn > 0
                ? `Due in ${dueIn}d`
                : format(due, "MMM d")}
            </span>
          )}
          <span className="ml-auto flex items-center gap-2.5">
            {project._count.comments > 0 && (
              <span className="flex items-center gap-1">
                <MessageSquare size={12} /> {project._count.comments}
              </span>
            )}
            {project._count.revisions > 0 && (
              <span className="flex items-center gap-1">
                <GitCommitHorizontal size={12} /> {project._count.revisions}
              </span>
            )}
            {project._count.attachments > 0 && (
              <span className="flex items-center gap-1">
                <Paperclip size={12} /> {project._count.attachments}
              </span>
            )}
          </span>
        </div>
      </div>
    </Link>
  );
}
