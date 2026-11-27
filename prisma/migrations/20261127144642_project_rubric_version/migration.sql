-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "classId" TEXT NOT NULL,
    "templateId" TEXT,
    "title" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "grade" INTEGER NOT NULL,
    "goals" TEXT NOT NULL,
    "durationWeeks" INTEGER NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "contentJson" TEXT NOT NULL,
    "rubricJson" TEXT NOT NULL,
    "rubricVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Project_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Project_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Project" ("classId", "contentJson", "createdAt", "dueDate", "durationWeeks", "goals", "grade", "id", "isDemo", "kind", "mode", "rubricJson", "templateId", "title") SELECT "classId", "contentJson", "createdAt", "dueDate", "durationWeeks", "goals", "grade", "id", "isDemo", "kind", "mode", "rubricJson", "templateId", "title" FROM "Project";
DROP TABLE "Project";
ALTER TABLE "new_Project" RENAME TO "Project";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
