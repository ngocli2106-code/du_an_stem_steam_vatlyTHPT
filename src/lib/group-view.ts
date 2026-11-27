import { prisma } from './db';
import type { SessionUser } from './auth';
import { loadProjectGroup } from './access';
import { parseDraft, type DraftContent } from './stages';
import type { Mode, ProjectContent, StageStatus } from './types';
import type { GradeDraft, PublishedResult, Rubric } from './rubric';
import type { EvidenceMeta } from '@/components/ContentView';
import { isOverdue } from './progress';

export interface StageView {
  key: number; id: string; status: StageStatus; version: number; due: Date | null; overdue: boolean;
  draft: DraftContent; draftEvidence: EvidenceMeta[]; updatedAt: Date; updatedBy: string | null;
  submissions: { id: string; number: number; submittedAt: Date; by: string; content: { data: Record<string, any>; evidenceMeta: EvidenceMeta[] } }[];
  feedbacks: { id: string; submissionId: string; kind: string; text: string; createdAt: Date; author: string }[];
}

export async function loadGroupView(user: SessionUser, pgId: string) {
  const { pg, isTeacher } = await loadProjectGroup(user, pgId);
  const project = pg.project;
  const [works, evidences, contributions, users] = await Promise.all([
    prisma.stageWork.findMany({ where: { projectGroupId: pg.id }, include: { submissions: { orderBy: { number: 'asc' } }, feedbacks: { orderBy: { createdAt: 'asc' } } } }),
    prisma.evidence.findMany({ where: { projectGroupId: pg.id } }),
    prisma.contribution.findMany({ where: { projectGroupId: pg.id, ...(isTeacher ? {} : { userId: user.id }) }, include: { user: true } }),
    prisma.user.findMany({ select: { id: true, displayName: true }, where: { OR: [{ groupMembers: { some: { groupId: pg.groupId } } }, { role: 'TEACHER', taughtClasses: { some: { id: project.classId } } }] } }),
  ]);
  const name = (id: string | null | undefined) => users.find((u) => u.id === id)?.displayName ?? '—';
  const evMap = new Map(evidences.map((e) => [e.id, { id: e.id, name: e.fileName, mime: e.mime, size: e.size, caption: '' } satisfies EvidenceMeta]));
  const now = new Date();
  const stages: StageView[] = project.stages.map((ps) => {
    const w = works.find((x) => x.stageKey === ps.stageKey)!;
    const draft = parseDraft(w.draftJson);
    const due = ps.dueDate ?? project.dueDate;
    const status = w.status as StageStatus;
    return {
      key: ps.stageKey, id: w.id, status, version: w.version, due, overdue: isOverdue(status, due, now),
      draft, updatedAt: w.updatedAt, updatedBy: w.updatedById ? name(w.updatedById) : null,
      draftEvidence: draft.evidence.map((e) => ({ ...(evMap.get(e.id) ?? { id: e.id, name: '(không còn)', mime: 'application/octet-stream', size: 0 }), caption: e.caption })),
      submissions: w.submissions.map((s) => {
        const c = JSON.parse(s.contentJson);
        return { id: s.id, number: s.number, submittedAt: s.submittedAt, by: name(s.submittedById), content: { data: c.data ?? {}, evidenceMeta: c.evidenceMeta ?? [] } };
      }),
      feedbacks: w.feedbacks.map((f) => ({ id: f.id, submissionId: f.submissionId, kind: f.kind, text: f.text, createdAt: f.createdAt, author: name(f.authorId) })),
    };
  }).sort((a, b) => a.key - b.key);

  const published: PublishedResult | null = pg.publishedJson ? JSON.parse(pg.publishedJson) : null;
  return {
    pg, isTeacher, project, groupName: pg.group.name,
    mode: project.mode as Mode, content: JSON.parse(project.contentJson) as ProjectContent, rubric: JSON.parse(project.rubricJson) as Rubric,
    members: pg.group.members.map((m) => ({ userId: m.userId, name: m.user.displayName, roleLabel: m.roleLabel })),
    stages, published,
    gradeDraft: isTeacher && pg.gradeDraftJson ? (JSON.parse(pg.gradeDraftJson) as GradeDraft) : null,
    contributions: contributions.map((c) => ({ userId: c.userId, name: c.user.displayName, contribution: c.contribution, ...(() => { const s = JSON.parse(c.selfEvalJson || '{}'); return { reflection: s.reflection ?? '', ratings: (s.ratings ?? {}) as Record<string, number> }; })(), updatedAt: c.updatedAt })),
  };
}
export type GroupView = Awaited<ReturnType<typeof loadGroupView>>;

export function nextAction(stages: StageView[]) {
  const rev = stages.find((s) => s.status === 'NEEDS_REVISION');
  if (rev) return { stage: rev, kind: 'revise' as const };
  const todo = stages.find((s) => s.status === 'IN_PROGRESS') ?? stages.find((s) => s.status === 'NOT_STARTED');
  if (todo) return { stage: todo, kind: todo.status === 'IN_PROGRESS' ? ('continue' as const) : ('start' as const) };
  const wait = stages.find((s) => s.status === 'SUBMITTED');
  return wait ? { stage: wait, kind: 'wait' as const } : null;
}
