import { db } from "@/lib/db";
import { ProjectCard } from "@/components/project-card";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const q = (searchParams.q || "").trim();

  const projects = q
    ? await db.project.findMany({
        where: {
          deletedAt: null,
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
            { crmOpportunityName: { contains: q, mode: "insensitive" } },
            { brief: { deliverables: { contains: q, mode: "insensitive" } } },
          ],
        },
        orderBy: { createdAt: "desc" },
        include: {
          teamLead: true,
          createdBy: true,
          brief: true,
          _count: { select: { comments: true, revisions: true, attachments: true } },
        },
      })
    : [];

  return (
    <div className="mx-auto max-w-5xl animate-fade-up">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          {q ? `Results for “${q}”` : "Search"}
        </h1>
        <p className="text-sm text-muted">
          {q ? `${projects.length} project${projects.length === 1 ? "" : "s"} found` : "Type above to search the archive."}
        </p>
      </div>

      {projects.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      ) : (
        q && (
          <div className="rounded-2xl border border-dashed border-hairline bg-surface-2 py-16 text-center text-sm text-faint">
            Nothing matched. Try a client name, deliverable, or opportunity.
          </div>
        )
      )}
    </div>
  );
}
