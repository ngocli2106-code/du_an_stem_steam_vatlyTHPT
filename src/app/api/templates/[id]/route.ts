import { prisma } from '@/lib/db';
import { requireUser, HttpError } from '@/lib/auth';
import { handle, readJson } from '@/lib/api';
import { validateRubric } from '@/lib/rubric';
import { templateBody } from '@/lib/schemas';

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const u = await requireUser('TEACHER', true);
    const { id } = await ctx.params;
    const t = await prisma.template.findUnique({ where: { id } });
    if (!t || t.ownerId !== u.id) throw new HttpError(404, 'Không tìm thấy mẫu của bạn (mẫu hệ thống không sửa trực tiếp, hãy sao chép).');
    const b = templateBody.parse(await readJson(req));
    const errs = validateRubric(b.rubric);
    if (errs.length) throw new HttpError(400, 'Rubric chưa hợp lệ: ' + errs.join(' '));
    await prisma.template.update({ where: { id }, data: { title: b.title, grade: b.grade, mode: b.mode, contentJson: JSON.stringify(b.content), rubricJson: JSON.stringify(b.rubric) } });
    return { ok: true };
  });
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const u = await requireUser('TEACHER');
    const { id } = await ctx.params;
    const t = await prisma.template.findUnique({ where: { id } });
    if (!t || (t.ownerId && t.ownerId !== u.id)) throw new HttpError(404, 'Không tìm thấy mẫu.');
    return { title: t.title, grade: t.grade, mode: t.mode, content: JSON.parse(t.contentJson), rubric: JSON.parse(t.rubricJson) };
  });
}
