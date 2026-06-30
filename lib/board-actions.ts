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
const DEFAULT_STATUSES = [
  { label: "New", color: "#9b9ba3" },
  { label: "Working", color: "#e0794b" },
  { label: "Review", color: "#c9852b" },
  { label: "Stuck", color: "#d24b8f" },
  { label: "Done", color: "#2fa36b" },
];
const DEFAULT_CATEGORY_TAGS = [
  { label: "design", color: "#5a4be0" },
  { label: "pre-engineering", color: "#e8a13a" },
  { label: "post-engineering", color: "#1fa37a" },
  { label: "design marketing", color: "#d24b8f" },
  { label: "concept dev", color: "#7d5be0" },
  { label: "3d viz", color: "#2bb673" },
  { label: "mockups", color: "#3aa0e8" },
];

/* ── Boards ─────────────────────────────────────────── */
export async function createBoard(name: string) {
  const last = await db.board.findFirst({ where: { deletedAt: null }, orderBy: { order: "desc" } });
  const board = await db.board.create({
    data: { name: name.trim() || "New board", order: (last?.order ?? 0) + 1 },
  });
  await db.$transaction([
    db.statusOption.createMany({
      data: DEFAULT_STATUSES.map((d, i) => ({ boardId: board.id, label: d.label, color: d.color, order: i })),
    }),
    db.categoryTag.createMany({
      data: DEFAULT_CATEGORY_TAGS.map((d, i) => ({ boardId: board.id, label: d.label, color: d.color, order: i })),
    }),
    db.group.create({ data: { boardId: board.id, name: "New group", color: "#5a4be0", order: 0 } }),
  ]);
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
  const grp = await db.group.findUnique({
    where: { id },
    include: { items: { where: { deletedAt: null }, orderBy: { order: "asc" } } },
  });
  if (!grp) return;
  // Never let a delete silently lose items — move them to another group first.
  if (grp.items.length > 0) {
    const other = await db.group.findFirst({
      where: { boardId: grp.boardId, id: { not: id } },
      orderBy: { order: "asc" },
    });
    if (!other) throw new Error("Can't delete the only group while it has items — move them first.");
    const last = await db.project.findFirst({ where: { groupId: other.id }, orderBy: { order: "desc" } });
    const base = (last?.order ?? 0) + 1;
    await db.$transaction(
      grp.items.map((it, i) => db.project.update({ where: { id: it.id }, data: { groupId: other.id, order: base + i } }))
    );
  }
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

/* ── Category tags ──────────────────────────────────── */
export async function createCategoryTag(boardId: string, label: string, color: string) {
  const last = await db.categoryTag.findFirst({ where: { boardId }, orderBy: { order: "desc" } });
  await db.categoryTag.create({
    data: { boardId, label: label.trim() || "New category", color, order: (last?.order ?? 0) + 1 },
  });
  refresh();
}
export async function updateCategoryTag(id: string, label: string, color: string) {
  await db.categoryTag.update({ where: { id }, data: { label: label.trim() || "Category", color } });
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
export async function setItemCategoryTag(id: string, categoryTagId: string | null) {
  if (categoryTagId) {
    const [item, tag] = await Promise.all([
      db.project.findUnique({ where: { id }, select: { boardId: true } }),
      db.categoryTag.findUnique({ where: { id: categoryTagId }, select: { boardId: true } }),
    ]);
    if (!item || !tag || item.boardId !== tag.boardId) throw new Error("Category tag does not belong to this board.");
  }
  await db.project.update({ where: { id }, data: { categoryTagId } });
  await log(id, "changed category");
  refresh();
}
export async function updateItemNotes(id: string, notes: string) {
  await db.project.update({ where: { id }, data: { notes: notes.trim() || null } });
  await log(id, "updated notes");
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

// Persist a drag reorder: every item in `orderedIds` is set to that group at its index.
// Handles both within-group reorder and moving an item into the group.
export async function reorderItems(groupId: string, orderedIds: string[]) {
  await db.$transaction(
    orderedIds.map((id, i) =>
      db.project.update({ where: { id }, data: { groupId, order: i } })
    )
  );
  refresh();
}

export async function reorderGroups(orderedIds: string[]) {
  await db.$transaction(
    orderedIds.map((id, i) => db.group.update({ where: { id }, data: { order: i } }))
  );
  refresh();
}

// Read an item's updates (comments) for the slide-over panel.
export async function getItemUpdates(itemId: string) {
  const [item, comments] = await Promise.all([
    db.project.findUnique({ where: { id: itemId }, select: { id: true, name: true } }),
    db.comment.findMany({
      where: { projectId: itemId },
      orderBy: { createdAt: "desc" },
      include: { author: true },
    }),
  ]);
  if (!item) return null;
  return {
    id: item.id,
    name: item.name,
    comments: comments.map((c) => ({
      id: c.id,
      body: c.body,
      createdAt: c.createdAt.toISOString(),
      author: { name: c.author.name, color: c.author.color },
    })),
  };
}

export async function addUpdate(itemId: string, body: string) {
  const user = await currentUser();
  if (!user || !body.trim()) return;
  await db.comment.create({ data: { projectId: itemId, authorId: user.id, body: body.trim() } });
  await db.activity.create({ data: { projectId: itemId, userId: user.id, action: "posted an update" } });
  refresh();
}
export async function deleteItem(id: string) {
  await requireAdmin();
  await db.project.update({ where: { id }, data: { deletedAt: new Date() } });
  await log(id, "archived an item");
  refresh();
}

/* ── Sub-items (nested checklist under an item) ─────── */
export async function addSubItem(projectId: string, name: string) {
  if (!name.trim()) return;
  const last = await db.subItem.findFirst({ where: { projectId }, orderBy: { order: "desc" } });
  await db.subItem.create({ data: { projectId, name: name.trim(), order: (last?.order ?? 0) + 1 } });
  await log(projectId, "added a sub-item", name.trim());
  refresh();
}
export async function toggleSubItem(id: string, done: boolean) {
  await db.subItem.update({ where: { id }, data: { done } });
  refresh();
}
export async function updateSubItem(
  id: string,
  data: { name?: string; startDate?: string | null; dueDate?: string | null }
) {
  const update: { name?: string; startDate?: Date | null; dueDate?: Date | null } = {};
  if (data.name !== undefined) update.name = data.name.trim() || "Untitled";
  if (data.startDate !== undefined) update.startDate = data.startDate ? new Date(data.startDate) : null;
  if (data.dueDate !== undefined) update.dueDate = data.dueDate ? new Date(data.dueDate) : null;
  await db.subItem.update({ where: { id }, data: update });
  refresh();
}
export async function deleteSubItem(id: string) {
  await db.subItem.update({ where: { id }, data: { deletedAt: new Date() } });
  refresh();
}
