-- Add board-scoped category tags and sub-item scheduling fields.
CREATE TABLE "CategoryTag" (
    "id" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CategoryTag_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Project" ADD COLUMN "categoryTagId" TEXT;
ALTER TABLE "SubItem" ADD COLUMN "startDate" TIMESTAMP(3);
ALTER TABLE "SubItem" ADD COLUMN "dueDate" TIMESTAMP(3);
ALTER TABLE "SubItem" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "SubItem" ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE INDEX "CategoryTag_boardId_idx" ON "CategoryTag"("boardId");
CREATE INDEX "Project_categoryTagId_idx" ON "Project"("categoryTagId");
CREATE INDEX "SubItem_deletedAt_idx" ON "SubItem"("deletedAt");

ALTER TABLE "CategoryTag" ADD CONSTRAINT "CategoryTag_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Project" ADD CONSTRAINT "Project_categoryTagId_fkey" FOREIGN KEY ("categoryTagId") REFERENCES "CategoryTag"("id") ON DELETE SET NULL ON UPDATE CASCADE;
