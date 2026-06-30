import { db } from "./db";

export type BoardFull = NonNullable<Awaited<ReturnType<typeof getBoard>>>;

export function getBoards() {
  return db.board.findMany({
    where: { deletedAt: null },
    orderBy: { order: "asc" },
    select: { id: true, name: true, color: true, icon: true },
  });
}

export async function getDefaultBoardId() {
  const b = await db.board.findFirst({
    where: { deletedAt: null },
    orderBy: { order: "asc" },
    select: { id: true },
  });
  return b?.id ?? null;
}

const itemInclude = {
  statusOption: true,
  categoryTag: true,
  teamLead: true,
  assignees: { orderBy: { name: "asc" } },
  subItems: {
    where: { deletedAt: null },
    orderBy: { order: "asc" },
    select: { id: true, name: true, done: true, startDate: true, dueDate: true },
  },
  _count: { select: { comments: true, attachments: true } },
} as const;

export function getBoard(id: string) {
  return db.board.findFirst({
    where: { id, deletedAt: null },
    include: {
      statuses: { orderBy: { order: "asc" } },
      categoryTags: { orderBy: { order: "asc" } },
      groups: {
        orderBy: { order: "asc" },
        include: {
          items: {
            where: { deletedAt: null },
            orderBy: { order: "asc" },
            include: itemInclude,
          },
        },
      },
    },
  });
}

export function getAllUsers() {
  return db.user.findMany({ orderBy: [{ role: "asc" }, { name: "asc" }] });
}
