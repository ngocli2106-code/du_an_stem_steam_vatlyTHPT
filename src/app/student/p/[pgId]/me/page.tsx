import { notFound } from 'next/navigation';
import { Shell, requirePageUser } from '@/components/Shell';
import { Crumbs, PageHeader } from '@/components/ui';
import { loadGroupView } from '@/lib/group-view';
import { HttpError } from '@/lib/auth';
import { ContributionForm } from './ContributionForm';

export const dynamic = 'force-dynamic';

export default async function MePage({ params }: { params: Promise<{ pgId: string }> }) {
  const user = await requirePageUser('STUDENT');
  const { pgId } = await params;
  let v;
  try { v = await loadGroupView(user, pgId); } catch (e) { if (e instanceof HttpError) notFound(); throw e; }
  const mine = v.contributions.find((c) => c.userId === user.id);
  return (
    <Shell user={user}>
      <Crumbs items={[{ href: '/student', label: 'Việc của nhóm' }, { href: `/student/p/${pgId}`, label: v.project.title }, { label: 'Đóng góp của tôi' }]} />
      <PageHeader title="Đóng góp và tự đánh giá của tôi" sub="Chỉ bạn và giáo viên xem được phần này. Phần này tách riêng với điểm sản phẩm của nhóm." />
      <ContributionForm pgId={pgId} initial={{ contribution: mine?.contribution ?? '', reflection: mine?.reflection ?? '', ratings: mine?.ratings ?? {} }} />
    </Shell>
  );
}
