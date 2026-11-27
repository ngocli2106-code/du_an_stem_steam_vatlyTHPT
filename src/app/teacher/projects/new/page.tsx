import Link from 'next/link';
import { prisma } from '@/lib/db';
import { Shell, requirePageUser } from '@/components/Shell';
import { Crumbs, PageHeader } from '@/components/ui';
import { ProjectForm } from '@/components/forms/ProjectForm';
import { blankContent } from '@/lib/templates';
import { DEFAULT_RUBRIC } from '@/lib/rubric';

export const dynamic = 'force-dynamic';

export default async function NewProject({ searchParams }: { searchParams: Promise<{ templateId?: string }> }) {
  const user = await requirePageUser('TEACHER');
  const { templateId } = await searchParams;
  const [classes, templates] = await Promise.all([
    prisma.class.findMany({ where: { teacherId: user.id }, include: { _count: { select: { groups: true } } }, orderBy: { name: 'asc' } }),
    prisma.template.findMany({ where: { OR: [{ ownerId: null }, { ownerId: user.id }] }, orderBy: [{ grade: 'asc' }, { title: 'asc' }] }),
  ]);
  const t = templateId ? templates.find((x) => x.id === templateId) : null;
  const initial = t
    ? { title: t.title, grade: t.grade, mode: t.mode as 'STEM' | 'STEAM', goals: '', content: JSON.parse(t.contentJson), rubric: JSON.parse(t.rubricJson), templateId: t.id }
    : { title: '', grade: 10, mode: 'STEM' as const, goals: '', content: blankContent(), rubric: DEFAULT_RUBRIC, templateId: null };
  return (
    <Shell user={user}>
      <Crumbs items={[{ href: '/teacher/projects', label: 'Dự án' }, { label: 'Giao dự án mới' }]} />
      <PageHeader title="Giao dự án mới" />
      <form method="get" className="card mb-5 flex flex-wrap items-end gap-3" aria-label="Chọn mẫu">
        <div className="min-w-[240px] flex-1"><label htmlFor="tpl" className="label">Bắt đầu từ</label>
          <select id="tpl" name="templateId" className="input" defaultValue={templateId ?? ''}>
            <option value="">Dự án trống (tự tạo)</option>
            {templates.map((x) => <option key={x.id} value={x.id}>{x.title} – gợi ý lớp {x.grade}, {x.mode}{x.ownerId ? ' (mẫu của tôi)' : ''}</option>)}
          </select></div>
        <button className="btn-secondary btn">Tải mẫu</button>
        <p className="hint w-full">Đổi mẫu sẽ nạp lại biểu mẫu bên dưới.</p>
      </form>
      {classes.length === 0 ? (
        <p className="card">Bạn chưa có lớp. <Link className="underline" href="/teacher/classes">Tạo lớp và chia nhóm</Link> trước.</p>
      ) : (
        <ProjectForm key={templateId ?? 'blank'} purpose="assign" initial={initial} classes={classes.map((c) => ({ id: c.id, name: c.name, grade: c.grade, groupCount: c._count.groups }))} />
      )}
    </Shell>
  );
}
