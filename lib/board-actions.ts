"use server";

import { revalidatePath } from "next/cache";
import { db } from "./db";
import { currentUser } from "./auth";

async function requireAdmin() {
  const user = await currentUser();
  if (!user || user.role !== "ADMIN") throw new Error("Only admins can delete.");
  return user;
}
async function log(projectId: string | null, action: string, detail?: string) {
  const user = await currentUser();
  await db.activity.create({
    data: { projectId: projectId ?? undefined, userId: user?.id, action, detail },
  });
}
const refresh = () => revalidatePath("/", "layout");

/* ── Boards ─────────────────────────────────────────── */
export async function createBoard(name: string) {
  const last = await db.board.findFirst({ where: { deletedAt: null }, orderBy: { order: "desc" } });
  const board = await db.board.create({
    data: { name: name.trim() || "New board", order: (last?.order ?? 0) + 1 },
  });
  // Every board starts with a usable status palette.
  const defaults = [
    { label: "New", color: "#9b9ba3" },
    { label: "Working", color: "#e0794b" },
    { label: "Review", color: "#c9852b" },
    { label: "Stuck", color: "#d24b8f" },
    { label: "Done", color: "#2fa36b" },
  ];
  await db.statusOption.createMany({
    data: defaults.map((d, i) => ({ boardId: board.id, label: d.label, color: d.color, order: i })),
  });
  await db.group.create({ data: { boardId: board.id, name: "New group", color: "#5a4be0", order: 0 } });
  refresh();
  return board.id;
}
export async function renameBoard(id: string, name: string) {
  await db.board.update({ where: { id }, data: { name: name.trim() || "Untitled" } });
  refresh();
}
export async function setBoardColor(id: string, color: string) {
  await db.board.update({ where: { id }, data: { color } });
  refresh();
}
export async function deleteBoard(id: string) {
  await requireAdmin();
  await db.board.update({ where: { id }, data: { deletedAt: new Date() } });
  refresh();
}

/* ── Groups ─────────────────────────────────────────── */
export async function createGroup(boardId: string, name: string) {
  const last = await db.group.findFirst({ where: { boardId }, orderBy: { order: "desc" } });
  await db.group.create({
    data: { boardId, name: name.trim() || "New group", color: "#5a4be0", order: (last?.order ?? 0) + 1 },
  });
  refresh();
}
export async function renameGroup(id: string, name: string) {
  await db.group.update({ where: { id }, data: { name: name.trim() || "Untitled" } });
  refresh();
}
export async function setGroupColor(id: string, color: string) {
  await db.group.update({ where: { id }, data: { color } });
  refresh();
}
export async function toggleGroupCollapse(id: string, collapsed: boolean) {
  await db.group.update({ where: { id }, data: { collapsed } });
  refresh();
}
export async function deleteGroup(id: string) {
  await requireAdmin();
  await db.group.delete({ where: { id } });
  refresh();
}

/* ── Status options ─────────────────────────────────── */
export async function createStatus(boardId: string, label: string, color: string) {
  const last = await db.statusOption.findFirst({ where: { boardId }, orderBy: { order: "desc" } });
  await db.statusOption.create({
    data: { boardId, label: label.trim() || "New", color, order: (last?.order ?? 0) + 1 },
  });
  refresh();
}
export async function updateStatus(id: string, label: string, color: string) {
  await db.statusOption.update({ where: { id }, data: { label: label.trim() || "Status", color } });
  refresh();
}
export async function deleteStatus(id: string) {
  await requireAdmin();
  await db.project.updateMany({ where: { statusOptionId: id }, data: { statusOptionId: null } });
  await db.statusOption.delete({ where: { id } });
  refresh();
}

/* ── Items (rows) ───────────────────────────────────── */
export async function createItem(boardId: string, groupId: string, name: string) {
  const user = await currentUser();
  if (!user) throw new Error("No active user");
  const last = await db.project.findFirst({ where: { groupId }, orderBy: { order: "desc" } });
  const firstStatus = await db.statusOption.findFirst({ where: { boardId }, orderBy: { order: "asc" } });
  const item = await db.project.create({
    data: {
      name: name.trim() || "New item",
      boardId, groupId, statusOptionId: firstStatus?.id,
      order: (last?.order ?? 0) + 1,
      createdById: user.id,
    },
  });
  await log(item.id, "added an item");
  refresh();
  return item.id;
}
export async function renameItem(id: string, name: string) {
  await db.project.update({ where: { id }, data: { name: name.trim() || "Untitled" } });
  refresh();
}
export async function setItemStatus(id: string, statusOptionId: string | null) {
  await db.project.update({ where: { id }, data: { statusOptionId } });
  await log(id, "changed status");
  refresh();
}
export async function setItemDate(
  id: string,
  field: "dueDate" | "startDate" | "endDate",
  value: string | null
) {
  await db.project.update({ where: { id }, data: { [field]: value ? new Date(value) : null } });
  refresh();
}
export async function toggleAssignee(itemId: string, userId: string) {
  const item = await db.project.findUnique({
    where: { id: itemId },
    select: { assignees: { select: { id: true } } },
  });
  const has = item?.assignees.some((a) => a.id === userId);
  await db.project.update({
    where: { id: itemId },
    data: { assignees: has ? { disconnect: { id: userId } } : { connect: { id: userId } } },
  });
  refresh();
}
export async function moveItem(itemId: string, groupId: string) {
  const last = await db.project.findFirst({ where: { groupId }, orderBy: { order: "desc" } });
  await db.project.update({ where: { id: itemId }, data: { groupId, order: (last?.order ?? 0) + 1 } });
  refresh();
}
export async function deleteItem(id: string) {
  await requireAdmin();
  await db.project.update({ where: { id }, data: { deletedAt: new Date() } });
  await log(id, "archived an item");
  refresh();
}
