import { prisma } from './db';
import { summarize, isOverdue, type GroupSummary } from './progress';
import type { StageStatus } from './types';

export interface OverviewRow {
  pgId: string; groupName: string; projectId: string; projectTitle: string; className: string; classId: string; groupId: string;
  isDemo: boolean; stageKeys: number[]; published: boolean;
  stages: { key: number; status: StageStatus; overdue: boolean; due: Date | null }[];
  summary: GroupSummary;
}

export async function teacherOverview(teacherId: string, f: { classId?: string; projectId?: string; groupId?: string; projectGroupIds?: string[] } = {}): Promise<OverviewRow[]> {
  const now = new Date();
  const pgs = await prisma.projectGroup.findMany({
    where: {
      project: { class: { teacherId, ...(f.classId ? { id: f.classId } : {}) }, ...(f.projectId ? { id: f.projectId } : {}) },
      ...(f.groupId ? { groupId: f.groupId } : {}),
    },
    include: { group: true, project: { include: { class: true, stages: true } }, stageWorks: true },
  });
  const rows = pgs.map((pg) => {
    const keys = pg.project.stages.map((s) => s.stageKey).sort((a, b) => a - b);
    const stages = keys.map((k) => {
      const sw = pg.stageWorks.find((x) => x.stageKey === k);
      const due = pg.project.stages.find((s) => s.stageKey === k)?.dueDate ?? pg.project.dueDate;
      const status = (sw?.status ?? 'NOT_STARTED') as StageStatus;
      return { key: k, status, due, overdue: isOverdue(status, due, now) };
    });
    return {
      pgId: pg.id, groupName: pg.group.name, groupId: pg.groupId, projectId: pg.projectId, projectTitle: pg.project.title,
      className: pg.project.class.name, classId: pg.project.classId, isDemo: pg.project.isDemo, stageKeys: keys,
      published: !!pg.publishedAt, stages,
      summary: summarize(stages.map((s) => ({ stageKey: s.key, status: s.status, due: s.due })), now),
    } satisfies OverviewRow;
  });
  rows.sort((a, b) => b.summary.priority - a.summary.priority || a.groupName.localeCompare(b.groupName, 'vi'));
  return rows;
}

export type StatusFilter = 'all' | 'waiting' | 'revision' | 'overdue' | 'notsubmitted';

export function matchesStatus(r: OverviewRow, f: StatusFilter): boolean {
  switch (f) {
    case 'waiting': return r.summary.waiting > 0;
    case 'revision': return r.summary.needsRevision > 0;
    case 'overdue': return r.summary.overdue > 0;
    case 'notsubmitted': return r.summary.notSubmitted > 0;
    default: return true;
  }
}
