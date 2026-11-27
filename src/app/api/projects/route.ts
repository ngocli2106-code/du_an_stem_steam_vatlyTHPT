import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireUser, HttpError } from '@/lib/auth';
import { loadOwnClass } from '@/lib/access';
import { handle, readJson } from '@/lib/api';
import { contentSchema, rubricSchema } from '@/lib/schemas';
import { criteriaOutsideStages, validateRubric } from '@/lib/rubric';
import { endOfDayVN } from '@/lib/progress';

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày không hợp lệ');
const body = z.object({
  classId: z.string(),
  templateId: z.string().nullable().optional(),
  title: z.string().trim().min(1, 'Nhập tên dự án').max(150),
  mode: z.enum(['STEM', 'STEAM']),
  kind: z.enum(['FULL', 'SHORT']),
  grade: z.number().int().min(10).max(12),
  goals: z.string().max(3000),
  durationWeeks: z.number().int().min(0).max(30),
  dueDate: date,
  stages: z.array(z.object({ key: z.number().int().min(1).max(7), dueDate: date.nullable().optional() })).min(1, 'Chọn ít nhất một chặng'),
  content: contentSchema,
  rubric: rubricSchema,
  confirmRubric: z.boolean().optional(),
});

export async function POST(req: Request) {
  return handle(async () => {
    const u = await requireUser('TEACHER', true);
    const b = body.parse(await readJson(req));
    await loadOwnClass(u, b.classId);

    if (b.templateId) {
      const t = await prisma.template.findUnique({ where: { id: b.templateId } });
      if (!t || (t.ownerId && t.ownerId !== u.id)) throw new HttpError(404, 'Không tìm thấy mẫu dự án.');
    }
    const keys = [...new Set(b.stages.map((s) => s.key))].sort((a, c) => a - c);
    if (b.kind === 'FULL' && keys.length !== 7) throw new HttpError(400, 'Dự án đầy đủ gồm cả 7 chặng.');
    if (b.kind === 'SHORT' && keys.length === 7) throw new HttpError(400, 'Nhiệm vụ ngắn chỉ giao một số chặng.');

    const errs = validateRubric(b.rubric);
    if (errs.length) throw new HttpError(400, 'Rubric chưa hợp lệ: ' + errs.join(' '));
    if (b.kind === 'SHORT') {
      if (!b.confirmRubric) throw new HttpError(400, 'Hãy xác nhận thang điểm trước khi giao nhiệm vụ ngắn.');
      const bad = criteriaOutsideStages(b.rubric, keys);
      if (bad.length) throw new HttpError(400, `Tiêu chí không gắn với chặng được giao: ${bad.map((c) => c.name).join(', ')}.`);
    }

    const groups = await prisma.group.findMany({ where: { classId: b.classId } });
    if (groups.length === 0) throw new HttpError(400, 'Lớp chưa có nhóm nào. Hãy chia nhóm trước khi giao dự án.');

    const due = endOfDayVN(b.dueDate);
    const stageDue = new Map(b.stages.map((s) => [s.key, s.dueDate ? endOfDayVN(s.dueDate) : due]));
    const project = await prisma.$transaction(async (tx) => {
      const p = await tx.project.create({
        data: {
          classId: b.classId, templateId: b.templateId ?? null, title: b.title, mode: b.mode, kind: b.kind, grade: b.grade,
          goals: b.goals, durationWeeks: b.durationWeeks, dueDate: due,
          contentJson: JSON.stringify(b.content), rubricJson: JSON.stringify(b.rubric),
          stages: { create: keys.map((k) => ({ stageKey: k, dueDate: stageDue.get(k)! })) },
        },
      });
      for (const g of groups) {
        await tx.projectGroup.create({ data: { projectId: p.id, groupId: g.id, stageWorks: { create: keys.map((k) => ({ stageKey: k })) } } });
      }
      return p;
    });
    return { id: project.id };
  });
}
