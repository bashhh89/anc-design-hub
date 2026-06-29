import { getBoard, getBoards, getDefaultBoardId, getAllUsers } from "@/lib/board-queries";
import { currentUser, isAdmin } from "@/lib/auth";
import { MondayBoard } from "@/components/monday-board";

export const dynamic = "force-dynamic";

export default async function BoardPage({ searchParams }: { searchParams: { b?: string } }) {
  const boards = await getBoards();
  const boardId = searchParams.b || (await getDefaultBoardId());

  if (!boardId || boards.length === 0) {
    return (
      <div className="mx-auto max-w-md py-24 text-center">
        <h1 className="font-display text-xl font-semibold tracking-tight">No boards yet</h1>
        <p className="mt-1 text-sm text-muted">Create your first board to start organizing work.</p>
      </div>
    );
  }

  const [board, users, me] = await Promise.all([getBoard(boardId), getAllUsers(), currentUser()]);
  if (!board) {
    return <div className="py-24 text-center text-sm text-muted">Board not found.</div>;
  }

  const groups = board.groups.map((g) => ({
    id: g.id,
    name: g.name,
    color: g.color,
    collapsed: g.collapsed,
    items: g.items.map((it) => ({
      id: it.id,
      name: it.name,
      statusOptionId: it.statusOptionId,
      dueDate: it.dueDate ? it.dueDate.toISOString() : null,
      startDate: it.startDate ? it.startDate.toISOString() : null,
      endDate: it.endDate ? it.endDate.toISOString() : null,
      assignees: it.assignees.map((a) => ({ id: a.id, name: a.name, color: a.color })),
      commentCount: it._count.comments,
      fileCount: it._count.attachments,
      subItems: it.subItems.map((s) => ({ id: s.id, name: s.name, done: s.done })),
    })),
  }));

  return (
    <MondayBoard
      board={{ id: board.id, name: board.name, color: board.color, icon: board.icon }}
      boards={boards}
      groups={groups}
      statuses={board.statuses.map((s) => ({ id: s.id, label: s.label, color: s.color, order: s.order }))}
      users={users.map((u) => ({ id: u.id, name: u.name, color: u.color, role: u.role }))}
      isAdmin={isAdmin(me)}
    />
  );
}
