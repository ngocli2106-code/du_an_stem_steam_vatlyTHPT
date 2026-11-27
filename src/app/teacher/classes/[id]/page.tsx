import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { Shell, requirePageUser } from '@/components/Shell';
import { Crumbs, PageHeader } from '@/components/ui';
import { ClassManager } from './ClassManager';

export const dynamic = 'force-dynamic';

export default async function ClassPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePageUser('TEACHER');
  const { id } = await params;
  const c = await prisma.class.findUnique({
    where: { id },
    include: { members: { include: { user: true } }, groups: { include: { members: true }, orderBy: { name: 'asc' } } },
  });
  if (!c || c.teacherId !== user.id) notFound();
  const students = c.members.filter((m) => m.user.role === 'STUDENT').map((m) => {
    const gm = c.groups.flatMap((g) => g.members).find((x) => x.userId === m.userId);
    return { userId: m.userId, name: m.user.displayName, code: m.user.studentCode, username: m.user.username, groupId: gm?.groupId ?? '', roleLabel: gm?.roleLabel ?? '' };
  }).sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  return (
    <Shell user={user} wide>
      <Crumbs items={[{ href: '/teacher/classes', label: 'Lớp và nhóm' }, { label: c.name }]} />
      <PageHeader title={`Lớp ${c.name}`} sub={`Khối ${c.grade} · ${students.length} học sinh · ${c.groups.length} nhóm`} />
      <ClassManager classId={c.id} students={students} groups={c.groups.map((g) => ({ id: g.id, name: g.name, count: g.members.length }))} />
    </Shell>
  );
}
