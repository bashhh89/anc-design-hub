import { getProjects } from "@/lib/queries";
import { Kanban } from "@/components/kanban";

export const dynamic = "force-dynamic";

export default async function BoardPage() {
  const projects = await getProjects();
  return (
    <div className="animate-fade-up">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Board</h1>
        <p className="text-sm text-muted">Drag a project to move it through the workflow.</p>
      </div>
      <Kanban
        projects={projects.map((p) => ({
          id: p.id,
          name: p.name,
          status: p.status,
          type: p.type,
          priority: p.priority,
          crmOpportunityName: p.crmOpportunityName,
          dueDate: p.dueDate ? p.dueDate.toISOString() : null,
          lead: p.teamLead ? { name: p.teamLead.name, color: p.teamLead.color } : null,
        }))}
      />
    </div>
  );
}
