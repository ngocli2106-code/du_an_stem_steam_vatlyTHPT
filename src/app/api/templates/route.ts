import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { handle, readJson } from '@/lib/api';
import { templateBody } from '@/lib/schemas';
import { validateRubric } from '@/lib/rubric';
import { HttpError } from '@/lib/auth';

export async function POST(req: Request) {
  return handle(async () => {
    const u = await requireUser('TEACHER', true);
    const b = templateBody.parse(await readJson(req));
    const errs = validateRubric(b.rubric);
    if (errs.length) throw new HttpError(400, 'Rubric chưa hợp lệ: ' + errs.join(' '));
    const t = await prisma.template.create({
      data: { ownerId: u.id, title: b.title, grade: b.grade, mode: b.mode, contentJson: JSON.stringify(b.content), rubricJson: JSON.stringify(b.rubric) },
    });
    return { id: t.id };
  });
}
