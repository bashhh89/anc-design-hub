import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

// The real ANC team. Daniel + Charlie are admins (they alone can delete).
export const ROSTER = [
  { email: "daniel@leda.design", name: "Daniel Croci", role: "ADMIN", color: "#5a4be0" },
  { email: "charlie.dinh@ancsports.net", name: "Charlie Dinh", role: "ADMIN", color: "#c9852b" },
  { email: "alex.gomez@ancsports.net", name: "Alex Gomez", role: "MEMBER", color: "#2e7dd1" },
  { email: "jireh.billings@ancsports.net", name: "Jireh Billings", role: "MEMBER", color: "#2fa36b" },
  { email: "jeremy.riley@ancsports.net", name: "Jeremy Riley", role: "MEMBER", color: "#d24b8f" },
  { email: "matt.hobbs@ancsports.net", name: "Matt Hobbs", role: "MEMBER", color: "#e0794b" },
  { email: "eric.gruner@ancsports.net", name: "Eric Gruner", role: "MEMBER", color: "#7a5af0" },
  { email: "jack.mccrossing@ancsports.net", name: "Jack McCrossing", role: "MEMBER", color: "#1aa3a3" },
  { email: "natalia.kovaleva@ancsports.net", name: "Natalia Kovaleva", role: "MEMBER", color: "#c0398f" },
] as const;

export async function seed() {
  await db.activity.deleteMany();
  await db.revision.deleteMany();
  await db.comment.deleteMany();
  await db.attachment.deleteMany();
  await db.voiceNote.deleteMany();
  await db.brief.deleteMany();
  await db.project.deleteMany();
  await db.categoryTag.deleteMany();
  await db.user.deleteMany();

  const u: Record<string, { id: string; name: string }> = {};
  for (const r of ROSTER) {
    const created = await db.user.create({ data: r as any });
    u[r.email] = { id: created.id, name: created.name };
  }
  const id = (email: string) => u[email].id;

  type Seed = {
    name: string; type: any; category: any; status: any; priority: any;
    lead: string; by: string; days: number; crm?: string; description: string;
    deliverables?: string;
    comments?: { who: string; body: string }[];
    revisions?: { label: string; note: string }[];
  };

  // No demo/sample projects. Real projects are created by users in the Hub UI or
  // arrive from the CRM via /api/intake/crm. This seed only establishes the team
  // and board structure — it never injects placeholder projects.
  const seeds: Seed[] = [];

  // Default board + Monday-style columns (statuses, groups)
  const board = await db.board.create({
    data: { name: "Sales-support Design", color: "#5a4be0", icon: "🎨", order: 0 },
  });
  const STATUS_DEFS = [
    { key: "New", color: "#9b9ba3" },
    { key: "Working", color: "#e0794b" },
    { key: "Review", color: "#c9852b" },
    { key: "Stuck", color: "#d24b8f" },
    { key: "Done", color: "#2fa36b" },
  ];
  const statusByLabel: Record<string, string> = {};
  let so = 0;
  for (const s of STATUS_DEFS) {
    const opt = await db.statusOption.create({
      data: { boardId: board.id, label: s.key, color: s.color, order: so++ },
    });
    statusByLabel[s.key] = opt.id;
  }
  const CATEGORY_TAG_DEFS = [
    { label: "design", color: "#5a4be0" },
    { label: "pre-engineering", color: "#e8a13a" },
    { label: "post-engineering", color: "#1fa37a" },
    { label: "design marketing", color: "#d24b8f" },
    { label: "concept dev", color: "#7d5be0" },
    { label: "3d viz", color: "#2bb673" },
    { label: "mockups", color: "#3aa0e8" },
    { label: "business dev", color: "#e0533a" },
  ];
  let co = 0;
  for (const c of CATEGORY_TAG_DEFS) {
    await db.categoryTag.create({
      data: { boardId: board.id, label: c.label, color: c.color, order: co++ },
    });
  }
  const enumToStatus: Record<string, string> = {
    REQUEST: "New", BRIEF: "Working", IN_PROGRESS: "Working",
    REVIEW: "Review", REVISIONS: "Stuck", APPROVED: "Done", DELIVERED: "Done",
  };

  const GROUP_DEFS = [
    { key: "external", name: "External pitches", color: "#2e7dd1" },
    { key: "internal", name: "Internal", color: "#7a5af0" },
    { key: "done", name: "Delivered", color: "#2fa36b" },
  ];
  const groupByKey: Record<string, string> = {};
  let go = 0;
  for (const g of GROUP_DEFS) {
    const grp = await db.group.create({
      data: { boardId: board.id, name: g.name, color: g.color, order: go++ },
    });
    groupByKey[g.key] = grp.id;
  }
  const groupFor = (s: Seed) =>
    s.status === "DELIVERED" || s.status === "APPROVED"
      ? "done"
      : s.category === "INTERNAL"
      ? "internal"
      : "external";

  let order = 0;
  for (const s of seeds) {
    const due = new Date();
    due.setDate(due.getDate() + s.days);
    const start = new Date();
    start.setDate(start.getDate() - 3);
    const proj = await db.project.create({
      data: {
        name: s.name, type: s.type, category: s.category, status: s.status, priority: s.priority,
        description: s.description, dueDate: due, startDate: start, endDate: due, order: order++,
        crmOpportunityName: s.crm ?? null, teamLeadId: id(s.lead), createdById: id(s.by),
        boardId: board.id,
        groupId: groupByKey[groupFor(s)],
        statusOptionId: statusByLabel[enumToStatus[s.status]],
        assignees: { connect: [{ id: id(s.lead) }] },
        ...(s.deliverables && {
          brief: { create: { deliverables: s.deliverables, submittedBy: "Sales", deadline: due } },
        }),
      },
    });
    await db.activity.create({ data: { projectId: proj.id, userId: id(s.by), action: "created the project" } });
    for (const c of s.comments ?? [])
      await db.comment.create({ data: { projectId: proj.id, authorId: id(c.who), body: c.body } });
    for (const r of s.revisions ?? [])
      await db.revision.create({ data: { projectId: proj.id, label: r.label, note: r.note, createdById: id(s.lead) } });
  }

  console.log("Seeded", seeds.length, "projects,", ROSTER.length, "people.");
}

// Run directly (npm run db:seed) — always reseeds.
if (process.argv[1] && process.argv[1].endsWith("seed.ts")) {
  seed().finally(() => db.$disconnect());
}
