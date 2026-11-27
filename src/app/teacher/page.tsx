import Link from 'next/link';
import { prisma } from '@/lib/db';
import { Shell, requirePageUser } from '@/components/Shell';
import { Empty, PageHeader } from '@/components/ui';
import { ProgressMatrix } from '@/components/ProgressMatrix';
import { matchesStatus, teacherOverview, type StatusFilter } from '@/lib/overview';

export const dynamic = 'force-dynamic';

const FILTERS: { v: StatusFilter; label: string }[] = [
  { v: 'all', label: 'Tất cả' }, { v: 'waiting', label: 'Chờ phản hồi' }, { v: 'revision', label: 'Cần bổ sung' },
  { v: 'notsubmitted', label: 'Chưa nộp' }, { v: 'overdue', label: 'Quá hạn' },
];

export default async function TeacherHome({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requirePageUser('TEACHER');
  const sp = await searchParams;
  const status = (FILTERS.some((f) => f.v === sp.status) ? sp.status : 'all') as StatusFilter;
  const [classes, projects, groups] = await Promise.all([
    prisma.class.findMany({ where: { teacherId: user.id }, orderBy: { name: 'asc' } }),
    prisma.project.findMany({ where: { class: { teacherId: user.id }, ...(sp.classId ? { classId: sp.classId } : {}) }, orderBy: { createdAt: 'desc' } }),
    prisma.group.findMany({ where: { class: { teacherId: user.id }, ...(sp.classId ? { classId: sp.classId } : {}) }, orderBy: { name: 'asc' } }),
  ]);
  const all = await teacherOverview(user.id, { classId: sp.classId, projectId: sp.projectId, groupId: sp.groupId });
  const rows = all.filter((r) => matchesStatus(r, status));
  const totals = {
    waiting: all.reduce((a, r) => a + r.summary.waiting, 0),
    revision: all.reduce((a, r) => a + r.summary.needsRevision, 0),
    overdue: all.reduce((a, r) => a + r.summary.overdue, 0),
    notsubmitted: all.reduce((a, r) => a + r.summary.notSubmitted, 0),
  };
  const q = (over: Record<string, string>) => {
    const p = new URLSearchParams();
    for (const k of ['classId', 'projectId', 'groupId', 'status']) { const v = over[k] ?? sp[k]; if (v) p.set(k, v); }
    return `/teacher?${p.toString()}`;
  };
  return (
    <Shell user={user} wide>
      <PageHeader title="Bảng tiến độ" sub="Nhóm cần xử lý nhất được xếp lên đầu. Tiến độ chỉ tính trên các chặng đã giao."
        actions={<Link href="/teacher/projects/new" className="btn-primary btn">+ Giao dự án mới</Link>} />

      <section aria-label="Cần xử lý" className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        {([['waiting', 'Chặng chờ phản hồi', totals.waiting, '⏳', 'border-amber-400'], ['revision', 'Chặng cần bổ sung', totals.revision, '↺', 'border-rose-400'],
          ['notsubmitted', 'Chặng chưa nộp', totals.notsubmitted, '○', 'border-slate-400'], ['overdue', 'Chặng quá hạn', totals.overdue, '!', 'border-red-600']] as const).map(([v, label, n, icon, b]) => (
          <Link key={v} href={q({ status: v })} aria-current={status === v ? 'true' : undefined}
            className={`card block border-2 !p-3 hover:bg-slate-50 ${b} ${status === v ? 'ring-2 ring-brand-600' : ''}`}>
            <div className="text-2xl font-bold"><span aria-hidden="true">{icon}</span> {n}</div>
            <div className="text-sm font-semibold">{label}</div>
          </Link>
        ))}
      </section>

      <form method="get" className="card mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5" aria-label="Bộ lọc">
        <div><label htmlFor="f-class" className="label">Lớp</label>
          <select id="f-class" name="classId" defaultValue={sp.classId ?? ''} className="input"><option value="">Tất cả lớp</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
        <div><label htmlFor="f-proj" className="label">Dự án</label>
          <select id="f-proj" name="projectId" defaultValue={sp.projectId ?? ''} className="input"><option value="">Tất cả dự án</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</select></div>
        <div><label htmlFor="f-group" className="label">Nhóm</label>
          <select id="f-group" name="groupId" defaultValue={sp.groupId ?? ''} className="input"><option value="">Tất cả nhóm</option>{groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select></div>
        <div><label htmlFor="f-status" className="label">Trạng thái</label>
          <select id="f-status" name="status" defaultValue={status} className="input">{FILTERS.map((f) => <option key={f.v} value={f.v}>{f.label}</option>)}</select></div>
        <div className="flex items-end gap-2"><button className="btn-primary btn">Lọc</button><Link href="/teacher" className="btn-secondary btn">Xoá lọc</Link></div>
      </form>

      {all.length === 0 ? (
        <Empty title="Chưa có dự án nào được giao">Tạo lớp, chia nhóm rồi <Link className="underline" href="/teacher/projects/new">giao dự án từ mẫu</Link>.</Empty>
      ) : rows.length === 0 ? (
        <Empty title="Không có nhóm nào khớp bộ lọc">Hãy xoá bớt điều kiện lọc.</Empty>
      ) : <ProgressMatrix rows={rows} />}
    </Shell>
  );
}
