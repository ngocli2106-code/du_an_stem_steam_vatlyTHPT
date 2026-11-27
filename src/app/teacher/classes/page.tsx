import Link from 'next/link';
import { prisma } from '@/lib/db';
import { Shell, requirePageUser } from '@/components/Shell';
import { Empty, PageHeader } from '@/components/ui';
import { NewClassForm } from './NewClassForm';

export const dynamic = 'force-dynamic';

export default async function ClassesPage() {
  const user = await requirePageUser('TEACHER');
  const classes = await prisma.class.findMany({ where: { teacherId: user.id }, include: { _count: { select: { members: true, groups: true, projects: true } } }, orderBy: { name: 'asc' } });
  return (
    <Shell user={user}>
      <PageHeader title="Lớp và nhóm" sub="Tạo lớp, thêm học sinh và chia nhóm trước khi giao dự án." />
      <NewClassForm />
      <h2 className="mb-2 mt-6 text-lg font-bold">Lớp của bạn</h2>
      {classes.length === 0 ? <Empty title="Chưa có lớp nào">Nhập tên lớp ở trên để bắt đầu.</Empty> : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {classes.map((c) => (
            <li key={c.id} className="card">
              <Link href={`/teacher/classes/${c.id}`} className="text-lg font-bold text-brand-700 underline">{c.name}</Link>
              <p className="text-sm text-slate-700">Khối {c.grade} · {c._count.members} học sinh · {c._count.groups} nhóm · {c._count.projects} dự án</p>
            </li>
          ))}
        </ul>
      )}
    </Shell>
  );
}
