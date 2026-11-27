import Link from 'next/link';
import { prisma } from '@/lib/db';
import { Shell, requirePageUser } from '@/components/Shell';
import { PageHeader } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function TemplatesPage() {
  const user = await requirePageUser('TEACHER');
  const templates = await prisma.template.findMany({ where: { OR: [{ ownerId: null }, { ownerId: user.id }] }, orderBy: [{ ownerId: 'asc' }, { grade: 'asc' }] });
  return (
    <Shell user={user}>
      <PageHeader title="Mẫu dự án" sub="Xem, sao chép và sửa mẫu. Khối lớp chỉ là gợi ý, bạn có thể điều chỉnh theo tiến độ dạy học." />
      <ul className="grid gap-3 md:grid-cols-2">
        {templates.map((t) => (
          <li key={t.id} className="card">
            <div className="flex flex-wrap gap-2"><span className="badge border-slate-400 bg-slate-50">Gợi ý lớp {t.grade}</span><span className="badge border-slate-400 bg-slate-50">{t.mode}</span>{t.ownerId ? <span className="badge border-brand-600 bg-brand-50 text-brand-800">Mẫu của tôi</span> : <span className="badge border-slate-400 bg-slate-50">Mẫu hệ thống</span>}</div>
            <h2 className="mt-2 text-lg font-bold"><Link className="text-brand-700 underline" href={`/teacher/templates/${t.id}`}>{t.title}</Link></h2>
            <p className="line-clamp-3 text-sm text-slate-800">{JSON.parse(t.contentJson).situation}</p>
            <div className="mt-3"><Link href={`/teacher/projects/new?templateId=${t.id}`} className="btn-primary btn btn-sm">Giao dự án từ mẫu</Link></div>
          </li>
        ))}
      </ul>
    </Shell>
  );
}
