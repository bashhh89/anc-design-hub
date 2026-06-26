import { db } from "./db";

export type ProjectWithRels = Awaited<ReturnType<typeof getProjects>>[number];

export function getProjects() {
  return db.project.findMany({
    where: { deletedAt: null },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    include: {
      teamLead: true,
      createdBy: true,
      brief: true,
      _count: { select: { comments: true, revisions: true, attachments: true } },
    },
  });
}

export function getProject(id: string) {
  return db.project.findFirst({
    where: { id, deletedAt: null },
    include: {
      teamLead: true,
      createdBy: true,
      brief: true,
      attachments: { orderBy: { createdAt: "desc" }, include: { uploadedBy: true } },
      comments: { orderBy: { createdAt: "desc" }, include: { author: true } },
      revisions: { orderBy: { createdAt: "desc" }, include: { createdBy: true } },
      activity: { orderBy: { createdAt: "desc" }, include: { user: true }, take: 50 },
    },
  });
}

export function getStats() {
  return db.$transaction([
    db.project.count({ where: { deletedAt: null } }),
    db.project.count({ where: { deletedAt: null, status: { in: ["IN_PROGRESS", "REVIEW", "REVISIONS"] } } }),
    db.project.count({ where: { deletedAt: null, priority: "URGENT" } }),
    db.project.count({ where: { deletedAt: null, status: "DELIVERED" } }),
  ]);
}
