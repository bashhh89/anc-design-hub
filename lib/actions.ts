"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { db } from "./db";
import { currentUser } from "./auth";
import type { Category, ProjectType, Status, Priority } from "@prisma/client";

export async function setViewAs(userId: string) {
  cookies().set("dh_user", userId, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  revalidatePath("/", "layout");
}

async function log(projectId: string | null, action: string, detail?: string) {
  const user = await currentUser();
  await db.activity.create({
    data: { projectId: projectId ?? undefined, userId: user?.id, action, detail },
  });
}

export async function createProject(form: FormData) {
  const user = await currentUser();
  if (!user) throw new Error("No active user");

  const name = String(form.get("name") || "").trim();
  if (!name) throw new Error("Project name is required");

  const deliverables = String(form.get("deliverables") || "").trim();

  const last = await db.project.findFirst({
    where: { deletedAt: null },
    orderBy: { order: "desc" },
  });

  const project = await db.project.create({
    data: {
      name,
      category: (form.get("category") as Category) || "EXTERNAL",
      type: (form.get("type") as ProjectType) || "DESIGN",
      priority: (form.get("priority") as Priority) || "MEDIUM",
      status: deliverables ? "BRIEF" : "REQUEST",
      description: String(form.get("description") || "").trim() || null,
      dueDate: form.get("dueDate") ? new Date(String(form.get("dueDate"))) : null,
      crmOpportunityName: String(form.get("crmOpportunityName") || "").trim() || null,
      order: (last?.order ?? 0) + 1,
      createdById: user.id,
      teamLeadId: user.id,
      ...(deliverables && {
        brief: {
          create: {
            deliverables,
            references: String(form.get("references") || "").trim() || null,
            deadline: form.get("deadline") ? new Date(String(form.get("deadline"))) : null,
            emailLink: String(form.get("emailLink") || "").trim() || null,
            teamsLink: String(form.get("teamsLink") || "").trim() || null,
            submittedBy: user.name,
          },
        },
      }),
    },
  });

  await log(project.id, "created the project");
  if (deliverables) await log(project.id, "submitted the brief");
  revalidatePath("/", "layout");
  return project.id;
}

export async function setStatus(projectId: string, status: Status) {
  const before = await db.project.findUnique({ where: { id: projectId } });
  await db.project.update({ where: { id: projectId }, data: { status } });
  if (before && before.status !== status) {
    await log(projectId, "moved status", `${before.status} → ${status}`);
  }
  revalidatePath("/", "layout");
}

export async function reorderInStatus(projectId: string, status: Status, order: number) {
  await db.project.update({ where: { id: projectId }, data: { status, order } });
  revalidatePath("/", "layout");
}

export async function updateProject(projectId: string, form: FormData) {
  const data: Record<string, unknown> = {};
  for (const key of ["name", "description", "notes", "crmOpportunityName"]) {
    if (form.has(key)) data[key] = String(form.get(key) || "").trim() || null;
  }
  if (form.has("category")) data.category = form.get("category");
  if (form.has("type")) data.type = form.get("type");
  if (form.has("priority")) data.priority = form.get("priority");
  if (form.has("status")) data.status = form.get("status");
  if (form.has("dueDate"))
    data.dueDate = form.get("dueDate") ? new Date(String(form.get("dueDate"))) : null;

  await db.project.update({ where: { id: projectId }, data });
  await log(projectId, "edited project details");
  revalidatePath("/", "layout");
}

export async function addComment(projectId: string, body: string) {
  const user = await currentUser();
  if (!user || !body.trim()) return;
  await db.comment.create({ data: { projectId, authorId: user.id, body: body.trim() } });
  await log(projectId, "commented");
  revalidatePath(`/projects/${projectId}`);
}

export async function addRevision(projectId: string, label: string, note: string) {
  const user = await currentUser();
  if (!user || !label.trim()) return;
  await db.revision.create({
    data: { projectId, label: label.trim(), note: note.trim() || null, createdById: user.id },
  });
  await db.project.update({ where: { id: projectId }, data: { status: "REVISIONS" } });
  await log(projectId, "logged a revision", label.trim());
  revalidatePath(`/projects/${projectId}`);
}

export async function addAttachment(projectId: string, name: string, url: string) {
  const user = await currentUser();
  if (!name.trim() || !url.trim()) return;
  await db.attachment.create({
    data: { projectId, name: name.trim(), url: url.trim(), uploadedById: user?.id },
  });
  await log(projectId, "added a file", name.trim());
  revalidatePath(`/projects/${projectId}`);
}

export async function softDeleteProject(projectId: string) {
  // Delete is admin-only (Daniel + Charlie). Enforced server-side, not just hidden
  // in the UI — a non-admin hitting this action directly is still refused.
  const user = await currentUser();
  if (!user || user.role !== "ADMIN") {
    throw new Error("Only admins can archive projects.");
  }
  await db.project.update({ where: { id: projectId }, data: { deletedAt: new Date() } });
  await log(projectId, "archived the project (soft-delete)");
  revalidatePath("/", "layout");
}

export async function restoreProject(projectId: string) {
  const user = await currentUser();
  if (!user || user.role !== "ADMIN") {
    throw new Error("Only admins can restore projects.");
  }
  await db.project.update({ where: { id: projectId }, data: { deletedAt: null } });
  await log(projectId, "restored the project");
  revalidatePath("/", "layout");
}
