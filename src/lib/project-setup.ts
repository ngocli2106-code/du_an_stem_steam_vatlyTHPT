import { prisma } from './db';

/** Tạo hồ sơ cho các nhóm của lớp chưa có hồ sơ trong dự án (ví dụ nhóm mới lập sau khi giao). */
export async function ensureProjectGroups(projectId: string) {
  const p = await prisma.project.findUnique({ where: { id: projectId }, include: { stages: true } });
  if (!p) return;
  const groups = await prisma.group.findMany({ where: { classId: p.classId } });
  const have = new Set((await prisma.projectGroup.findMany({ where: { projectId } })).map((x) => x.groupId));
  for (const g of groups) {
    if (have.has(g.id)) continue;
    await prisma.projectGroup.create({
      data: { projectId, groupId: g.id, stageWorks: { create: p.stages.map((s) => ({ stageKey: s.stageKey })) } },
    });
  }
}
