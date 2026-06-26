import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Inbound intake from the CRM. When an opportunity is flagged as needing design,
// the CRM POSTs here and the Hub creates (or updates) a matching item in the
// "New from CRM" group. Idempotent by crmOpportunityId — re-sends never duplicate.
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-intake-secret");
  if (!process.env.INTAKE_SECRET || secret !== process.env.INTAKE_SECRET) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const opportunityId = String(body.opportunityId || "").trim();
  const name = String(body.name || "").trim();
  if (!opportunityId || !name) {
    return NextResponse.json(
      { ok: false, error: "opportunityId and name are required" },
      { status: 400 }
    );
  }

  const board = await db.board.findFirst({
    where: { deletedAt: null },
    orderBy: { order: "asc" },
  });
  if (!board) {
    return NextResponse.json({ ok: false, error: "No board configured" }, { status: 503 });
  }

  // Already intaken? Update light fields and return (idempotent).
  const existing = await db.project.findFirst({
    where: { crmOpportunityId: opportunityId, deletedAt: null },
  });
  if (existing) {
    await db.project.update({
      where: { id: existing.id },
      data: {
        crmOpportunityName: String(body.account || body.name || existing.crmOpportunityName || "").trim() || null,
        ...(body.deadline && { dueDate: new Date(body.deadline) }),
      },
    });
    return NextResponse.json({ ok: true, itemId: existing.id, created: false });
  }

  // Landing group + status (create-if-missing, idempotent).
  let group = await db.group.findFirst({ where: { boardId: board.id, name: "New from CRM" } });
  if (!group) {
    const last = await db.group.findFirst({ where: { boardId: board.id }, orderBy: { order: "desc" } });
    group = await db.group.create({
      data: { boardId: board.id, name: "New from CRM", color: "#5a4be0", order: (last?.order ?? 0) + 1 },
    });
  }
  const status =
    (await db.statusOption.findFirst({ where: { boardId: board.id, label: "New" } })) ??
    (await db.statusOption.findFirst({ where: { boardId: board.id }, orderBy: { order: "asc" } }));

  // Creator: the seeded admin (Daniel). Required FK.
  const creator = await db.user.findFirst({ orderBy: { createdAt: "asc" } });
  if (!creator) {
    return NextResponse.json({ ok: false, error: "No users configured" }, { status: 503 });
  }

  const typeMap: Record<string, string> = {
    DESIGN: "DESIGN", DEVELOPMENT: "DEVELOPMENT", ENGINEERING: "ENGINEERING", MARKETING: "MARKETING",
  };

  const last = await db.project.findFirst({ where: { groupId: group.id }, orderBy: { order: "desc" } });
  const item = await db.project.create({
    data: {
      name,
      type: (typeMap[String(body.type || "").toUpperCase()] as any) || "DESIGN",
      category: "EXTERNAL",
      priority: "MEDIUM",
      description: String(body.deliverables || body.description || "").trim() || null,
      crmOpportunityId: opportunityId,
      crmOpportunityName: String(body.account || body.name || "").trim() || null,
      dueDate: body.deadline ? new Date(body.deadline) : null,
      boardId: board.id,
      groupId: group.id,
      statusOptionId: status?.id ?? null,
      order: (last?.order ?? 0) + 1,
      createdById: creator.id,
      teamLeadId: creator.id,
      ...(body.deliverables && {
        brief: {
          create: {
            deliverables: String(body.deliverables).trim(),
            submittedBy: "CRM intake",
            deadline: body.deadline ? new Date(body.deadline) : null,
          },
        },
      }),
    },
  });

  await db.activity.create({
    data: { projectId: item.id, userId: creator.id, action: "arrived from the CRM", detail: opportunityId },
  });

  return NextResponse.json({ ok: true, itemId: item.id, created: true });
}
