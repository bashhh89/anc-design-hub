// Boot seed — IDEMPOTENT and CONCURRENCY-SAFE.
//
// Runs inside one interactive transaction guarded by a Postgres advisory lock so
// that overlapping container boots (rolling updates, restarts) serialize: the
// first boot populates, every later boot finds everything present and no-ops.
// There is NO deleteMany here — boot never wipes data. The destructive wipe-seed
// lives only in seed.ts for local `npm run db:seed`.
import { PrismaClient, type Prisma } from "@prisma/client";

const db = new PrismaClient();
const LOCK_KEY = 778921; // arbitrary, app-wide

const ROSTER = [
  { email: "daniel@leda.design", name: "Daniel Croci", role: "ADMIN" as const, color: "#5a4be0" },
  { email: "charlie.dinh@ancsports.net", name: "Charlie Dinh", role: "ADMIN" as const, color: "#c9852b" },
  { email: "alex.gomez@ancsports.net", name: "Alex Gomez", role: "MEMBER" as const, color: "#2e7dd1" },
  { email: "jireh.billings@ancsports.net", name: "Jireh Billings", role: "MEMBER" as const, color: "#2fa36b" },
  { email: "jeremy.riley@ancsports.net", name: "Jeremy Riley", role: "MEMBER" as const, color: "#d24b8f" },
  { email: "matt.hobbs@ancsports.net", name: "Matt Hobbs", role: "MEMBER" as const, color: "#e0794b" },
  { email: "eric.gruner@ancsports.net", name: "Eric Gruner", role: "MEMBER" as const, color: "#7a5af0" },
  { email: "jack.mccrossing@ancsports.net", name: "Jack McCrossing", role: "MEMBER" as const, color: "#1aa3a3" },
  { email: "natalia.kovaleva@ancsports.net", name: "Natalia Kovaleva", role: "MEMBER" as const, color: "#c0398f" },
];
const STATUSES = [
  { label: "New", color: "#9b9ba3" },
  { label: "Working", color: "#e0794b" },
  { label: "Review", color: "#c9852b" },
  { label: "Stuck", color: "#d24b8f" },
  { label: "Done", color: "#2fa36b" },
];
const CATEGORY_TAGS = [
  { label: "design", color: "#5a4be0" },
  { label: "pre-engineering", color: "#e8a13a" },
  { label: "post-engineering", color: "#1fa37a" },
  { label: "design marketing", color: "#d24b8f" },
  { label: "concept dev", color: "#7d5be0" },
  { label: "3d viz", color: "#2bb673" },
  { label: "mockups", color: "#3aa0e8" },
];
const GROUPS = [
  { key: "external", name: "External pitches", color: "#2e7dd1" },
  { key: "internal", name: "Internal", color: "#7a5af0" },
  { key: "done", name: "Delivered", color: "#2fa36b" },
];
type Item = {
  name: string; type: any; category: any; statusLabel: string; priority: any;
  lead: string; by: string; days: number; group: string; crm?: string; description: string;
  deliverables?: string; comments?: { who: string; body: string }[]; revisions?: { label: string; note: string }[];
};
// No demo/sample projects. Real projects are created by users in the Hub UI or
// arrive from the CRM via /api/intake/crm. Boot seed only ensures team + board
// structure exists — it never injects placeholder projects.
const ITEMS: Item[] = [];

const statusToEnum: Record<string, any> = { New: "REQUEST", Working: "IN_PROGRESS", Review: "REVIEW", Stuck: "REVISIONS", Done: "DELIVERED" };

async function ensure(tx: Prisma.TransactionClient) {
  const userId: Record<string, string> = {};
  for (const r of ROSTER) {
    const u = await tx.user.upsert({
      where: { email: r.email },
      update: { name: r.name, role: r.role, color: r.color },
      create: r,
    });
    userId[r.email] = u.id;
  }

  let board = await tx.board.findFirst({ where: { name: "Sales-support Design", deletedAt: null } });
  if (!board) board = await tx.board.create({ data: { name: "Sales-support Design", color: "#5a4be0", icon: "🎨", order: 0 } });

  const statusId: Record<string, string> = {};
  let so = 0;
  for (const s of STATUSES) {
    let opt = await tx.statusOption.findFirst({ where: { boardId: board.id, label: s.label } });
    if (!opt) opt = await tx.statusOption.create({ data: { boardId: board.id, label: s.label, color: s.color, order: so } });
    statusId[s.label] = opt.id;
    so++;
  }

  let co = 0;
  for (const c of CATEGORY_TAGS) {
    const existing = await tx.categoryTag.findFirst({ where: { boardId: board.id, label: c.label } });
    if (!existing) await tx.categoryTag.create({ data: { boardId: board.id, label: c.label, color: c.color, order: co } });
    co++;
  }

  const groupId: Record<string, string> = {};
  let go = 0;
  for (const g of GROUPS) {
    let grp = await tx.group.findFirst({ where: { boardId: board.id, name: g.name } });
    if (!grp) grp = await tx.group.create({ data: { boardId: board.id, name: g.name, color: g.color, order: go } });
    groupId[g.key] = grp.id;
    go++;
  }

  let order = 0;
  for (const it of ITEMS) {
    order++;
    const exists = await tx.project.findFirst({ where: { name: it.name, boardId: board.id } });
    if (exists) continue;
    const due = new Date(); due.setDate(due.getDate() + it.days);
    const start = new Date(); start.setDate(start.getDate() - 3);
    const proj = await tx.project.create({
      data: {
        name: it.name, type: it.type, category: it.category, status: statusToEnum[it.statusLabel], priority: it.priority,
        description: it.description, dueDate: due, startDate: start, endDate: due, order,
        crmOpportunityName: it.crm ?? null,
        boardId: board.id, groupId: groupId[it.group], statusOptionId: statusId[it.statusLabel],
        teamLeadId: userId[it.lead], createdById: userId[it.by],
        assignees: { connect: [{ id: userId[it.lead] }] },
        ...(it.deliverables && { brief: { create: { deliverables: it.deliverables, submittedBy: "Sales", deadline: due } } }),
      },
    });
    await tx.activity.create({ data: { projectId: proj.id, userId: userId[it.by], action: "created the project" } });
    for (const c of it.comments ?? []) await tx.comment.create({ data: { projectId: proj.id, authorId: userId[c.who], body: c.body } });
    for (const r of it.revisions ?? []) await tx.revision.create({ data: { projectId: proj.id, label: r.label, note: r.note, createdById: userId[it.lead] } });
  }
  return { users: ROSTER.length, board: board.name };
}

async function main() {
  const out = await db.$transaction(
    async (tx) => {
      await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(${LOCK_KEY})`);
      return ensure(tx);
    },
    { timeout: 120000, maxWait: 120000 }
  );
  console.log("ensure-seed: ready —", out.users, "people, board:", out.board);
}

main()
  .catch((e) => console.error("ensure-seed failed (continuing to start anyway):", e?.message ?? e))
  .finally(() => db.$disconnect());
