import { prisma } from './db';
import { HttpError, type SessionUser } from './auth';

/** Nạp hồ sơ nhóm và kiểm tra quyền. Trả 404 khi không có quyền để không lộ sự tồn tại. */
export async function loadProjectGroup(user: SessionUser, pgId: string) {
  const pg = await prisma.projectGroup.findUnique({
    where: { id: pgId },
    include: { project: { include: { class: true, stages: { orderBy: { stageKey: 'asc' } } } }, group: { include: { members: { include: { user: true } } } } },
  });
  if (!pg) throw new HttpError(404, 'Không tìm thấy hồ sơ nhóm.');
  if (user.role === 'TEACHER') {
    if (pg.project.class.teacherId !== user.id) throw new HttpError(404, 'Không tìm thấy hồ sơ nhóm.');
    return { pg, isTeacher: true as const };
  }
  const member = pg.group.members.some((m) => m.userId === user.id);
  if (!member) throw new HttpError(404, 'Không tìm thấy hồ sơ nhóm.');
  return { pg, isTeacher: false as const };
}

export function assertStageAssigned(pg: { project: { stages: { stageKey: number }[] } }, stageKey: number) {
  if (!Number.isInteger(stageKey) || !pg.project.stages.some((s) => s.stageKey === stageKey)) {
    throw new HttpError(404, 'Chặng này không được giao trong dự án.');
  }
}

export async function loadOwnClass(user: SessionUser, classId: string) {
  const c = await prisma.class.findUnique({ where: { id: classId } });
  if (!c || c.teacherId !== user.id) throw new HttpError(404, 'Không tìm thấy lớp.');
  return c;
}

export async function loadOwnProject(user: SessionUser, projectId: string) {
  const p = await prisma.project.findUnique({ where: { id: projectId }, include: { class: true, stages: { orderBy: { stageKey: 'asc' } } } });
  if (!p || p.class.teacherId !== user.id) throw new HttpError(404, 'Không tìm thấy dự án.');
  return p;
}
