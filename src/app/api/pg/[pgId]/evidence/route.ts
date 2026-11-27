import { prisma } from '@/lib/db';
import { requireUser, HttpError } from '@/lib/auth';
import { handle } from '@/lib/api';
import { loadStage } from '@/lib/stage-ops';
import { REVISE_STATES } from '@/lib/progress';
import { MAX_UPLOAD, safeFileName, saveUpload, sniffMime } from '@/lib/storage';
import type { StageStatus } from '@/lib/types';

export async function POST(req: Request, ctx: { params: Promise<{ pgId: string }> }) {
  return handle(async () => {
    const u = await requireUser('STUDENT', true);
    const { pgId } = await ctx.params;
    let form: FormData;
    try { form = await req.formData(); } catch { throw new HttpError(400, 'Yêu cầu tải lên không hợp lệ.'); }
    const file = form.get('file');
    const key = String(form.get('stageKey') ?? '');
    if (!(file instanceof File)) throw new HttpError(400, 'Chưa chọn tệp.');
    const { sw, pg, key: stageKey } = await loadStage(u, pgId, key);
    if (!REVISE_STATES.includes(sw.status as StageStatus)) throw new HttpError(409, 'Chặng đang khoá, không thể thêm minh chứng.');
    if (file.size > MAX_UPLOAD) throw new HttpError(413, 'Tệp quá lớn (tối đa 4 MB). Ảnh chụp sẽ được tự nén; với PDF hãy giảm dung lượng trước khi tải.');
    if ((await prisma.evidence.count({ where: { projectGroupId: pg.id } })) >= 60) throw new HttpError(400, 'Hồ sơ đã đạt giới hạn 60 tệp.');
    const buf = Buffer.from(await file.arrayBuffer());
    const kind = sniffMime(buf);
    if (!kind) throw new HttpError(415, 'Chỉ nhận ảnh JPG, PNG, WebP hoặc tệp PDF.');
    const storedName = await saveUpload(buf, kind);
    const ev = await prisma.evidence.create({
      data: { projectGroupId: pg.id, stageKey, fileName: safeFileName(file.name), storedName, mime: kind.mime, size: buf.length, uploaderId: u.id },
    });
    return { id: ev.id, name: ev.fileName, mime: ev.mime, size: ev.size };
  });
}
