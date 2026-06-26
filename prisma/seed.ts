import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

export async function seed() {
  await db.activity.deleteMany();
  await db.revision.deleteMany();
  await db.comment.deleteMany();
  await db.attachment.deleteMany();
  await db.voiceNote.deleteMany();
  await db.brief.deleteMany();
  await db.project.deleteMany();
  await db.user.deleteMany();

  // Daniel created first → he is the resolved current user (his hub).
  const daniel = await db.user.create({
    data: { name: "Daniel Croci", email: "daniel@leda.design", role: "ADMIN", color: "#5a4be0" },
  });
  const natalia = await db.user.create({
    data: { name: "Natalia Kovaleva", email: "natalia@ancsports.net", role: "SALES", color: "#d24b8f" },
  });
  const marcus = await db.user.create({
    data: { name: "Marcus Reed", email: "marcus@ancsports.net", role: "SALES", color: "#2e7dd1" },
  });
  const elena = await db.user.create({
    data: { name: "Elena Powers", email: "elena@ancsports.net", role: "MEMBER", color: "#2fa36b" },
  });

  type Seed = {
    name: string;
    type: any;
    category: any;
    status: any;
    priority: any;
    lead: string;
    by: string;
    days: number; // due in N days from now
    crm?: string;
    description: string;
    deliverables?: string;
    comments?: { who: string; body: string }[];
    revisions?: { label: string; note: string }[];
  };

  const seeds: Seed[] = [
    {
      name: "Rams SoFi concourse LED renders",
      type: "DESIGN", category: "EXTERNAL", status: "IN_PROGRESS", priority: "URGENT",
      lead: daniel.id, by: natalia.id, days: 4, crm: "LA Rams — Concourse Refresh 2026",
      description: "Photoreal renders of the ribbon + concourse LED package for the Rams pitch. Day and gameday lighting states.",
      deliverables: "6 hero renders (3 day / 3 gameday), 1 fly-through still set, sized for deck + large-format print.",
      comments: [
        { who: natalia.id, body: "Client wants the gameday shots to feel loud — crowd, color, motion blur ok." },
        { who: daniel.id, body: "First gameday angle is rendering overnight, review tomorrow AM." },
      ],
      revisions: [{ label: "Rev A — angle change", note: "Sales asked to drop the camera to seat level on hero 2." }],
    },
    {
      name: "Dodgers premium club signage pitch",
      type: "DESIGN", category: "EXTERNAL", status: "REVIEW", priority: "HIGH",
      lead: daniel.id, by: marcus.id, days: 2, crm: "LA Dodgers — Premium Club",
      description: "Environmental signage + wayfinding concept boards for the premium club proposal.",
      deliverables: "3 concept boards, 2 material call-out sheets.",
      comments: [{ who: marcus.id, body: "Need this for the Thursday walkthrough." }],
    },
    {
      name: "ANC capabilities deck — 2026 refresh",
      type: "MARKETING", category: "INTERNAL", status: "REVISIONS", priority: "MEDIUM",
      lead: daniel.id, by: natalia.id, days: 9,
      description: "Refresh the master capabilities deck used across Sales. New case studies + updated brand.",
      deliverables: "28-slide master deck, editable source, PDF export.",
      revisions: [
        { label: "Rev A", note: "Swap the old Chase Center photo for the new night shot." },
        { label: "Rev B", note: "Leadership wants the LiveSync section moved up front." },
      ],
    },
    {
      name: "Knicks MSG ribbon concept",
      type: "ENGINEERING", category: "EXTERNAL", status: "BRIEF", priority: "HIGH",
      lead: daniel.id, by: marcus.id, days: 12, crm: "NY Knicks — MSG Ribbon",
      description: "Technical concept + render for a wraparound ribbon proposal.",
      deliverables: "1 technical layout, 2 renders, pixel-pitch call-outs.",
    },
    {
      name: "Sounders matchday social pack",
      type: "MARKETING", category: "EXTERNAL", status: "APPROVED", priority: "LOW",
      lead: elena.id, by: natalia.id, days: 1, crm: "Seattle Sounders",
      description: "Matchday graphics template pack for the partnership pitch.",
      deliverables: "Story + feed templates, 4 layouts.",
    },
    {
      name: "Heat arena fascia mockup",
      type: "DESIGN", category: "EXTERNAL", status: "REQUEST", priority: "MEDIUM",
      lead: daniel.id, by: marcus.id, days: 15, crm: "Miami Heat — Arena Fascia",
      description: "Sales flagged renders needed. Awaiting brief details before scoping.",
    },
    {
      name: "Innovation lab brand system",
      type: "DEVELOPMENT", category: "INTERNAL", status: "IN_PROGRESS", priority: "MEDIUM",
      lead: daniel.id, by: daniel.id, days: 20,
      description: "Visual system + component kit for the internal Innovation lab microsite.",
      deliverables: "Logo lockups, color + type system, 12 UI components.",
    },
    {
      name: "Chiefs suite-level proposal renders",
      type: "DESIGN", category: "EXTERNAL", status: "DELIVERED", priority: "HIGH",
      lead: daniel.id, by: natalia.id, days: -3, crm: "KC Chiefs — Suites",
      description: "Delivered render set for the suite-level display proposal.",
      deliverables: "4 renders delivered + source files.",
      comments: [{ who: natalia.id, body: "Client loved these. Closed the meeting strong — thank you." }],
    },
  ];

  let order = 0;
  for (const s of seeds) {
    const due = new Date();
    due.setDate(due.getDate() + s.days);
    const proj = await db.project.create({
      data: {
        name: s.name, type: s.type, category: s.category, status: s.status, priority: s.priority,
        description: s.description, dueDate: due, order: order++,
        crmOpportunityName: s.crm ?? null, teamLeadId: s.lead, createdById: s.by,
        ...(s.deliverables && {
          brief: { create: { deliverables: s.deliverables, submittedBy: "Sales", deadline: due } },
        }),
      },
    });
    await db.activity.create({ data: { projectId: proj.id, userId: s.by, action: "created the project" } });
    for (const c of s.comments ?? [])
      await db.comment.create({ data: { projectId: proj.id, authorId: c.who, body: c.body } });
    for (const r of s.revisions ?? [])
      await db.revision.create({ data: { projectId: proj.id, label: r.label, note: r.note, createdById: s.lead } });
  }

  console.log("Seeded", seeds.length, "projects, 4 users.");
}

// Run directly (npm run db:seed) — always reseeds.
if (process.argv[1] && process.argv[1].endsWith("seed.ts")) {
  seed().finally(() => db.$disconnect());
}
