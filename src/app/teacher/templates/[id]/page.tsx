import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { Shell, requirePageUser } from '@/components/Shell';
import { Crumbs, PageHeader } from '@/components/ui';
import { ProjectForm } from '@/components/forms/ProjectForm';
import { CopyTemplate } from './CopyTemplate';
import type { ProjectContent } from '@/lib/types';
import { stageName } from '@/lib/stages';

export const dynamic = 'force-dynamic';

export default async function TemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePageUser('TEACHER');
  const { id } = await params;
  const t = await prisma.template.findUnique({ where: { id } });
  if (!t || (t.ownerId && t.ownerId !== user.id)) notFound();
  const content: ProjectContent = JSON.parse(t.contentJson);
  const owned = t.ownerId === user.id;
  if (owned) {
    return (
      <Shell user={user}>
        <Crumbs items={[{ href: '/teacher/templates', label: 'Mẫu dự án' }, { label: t.title }]} />
        <PageHeader title="Sửa mẫu của tôi" sub="Dự án đã giao trước đây giữ nguyên bản rubric và nội dung tại thời điểm giao." />
        <ProjectForm purpose="template" initial={{ title: t.title, grade: t.grade, mode: t.mode as 'STEM' | 'STEAM', goals: '', content, rubric: JSON.parse(t.rubricJson), templateEditableId: t.id }} />
      </Shell>
    );
  }
  const L = ({ title, items }: { title: string; items: string[] }) => items.length ? <div><h3 className="font-bold">{title}</h3><ul className="list-disc pl-5 text-sm">{items.map((x, i) => <li key={i}>{x}</li>)}</ul></div> : null;
  return (
    <Shell user={user}>
      <Crumbs items={[{ href: '/teacher/templates', label: 'Mẫu dự án' }, { label: t.title }]} />
      <PageHeader title={t.title} sub={`Gợi ý lớp ${t.grade} · ${t.mode} · mẫu hệ thống (chỉ đọc, hãy sao chép để sửa)`}
        actions={<><Link href={`/teacher/projects/new?templateId=${t.id}`} className="btn-primary btn">Giao dự án</Link><CopyTemplate id={t.id} title={t.title} /></>} />
      <div className="card space-y-4">
        <div><h3 className="font-bold">Tình huống</h3><p className="text-sm">{content.situation}</p></div>
        <L title="Yêu cầu sản phẩm" items={content.productRequirements} />
        <L title="Kiến thức nền" items={content.background} />
        <L title="Vật liệu phổ thông" items={content.materials} />
        <L title="Tiêu chí thành công và ràng buộc" items={content.criteria.map((c) => `${c.type === 'success' ? '[Tiêu chí] ' : '[Ràng buộc] '}${c.text}`)} />
        <L title="Câu hỏi gợi mở" items={content.guidingQuestions} />
        <div><h3 className="font-bold">Nhiệm vụ theo chặng</h3><ul className="text-sm">{Object.entries(content.stages).map(([k, v]) => <li key={k}><b>{k}. {stageName(Number(k))}:</b> {v.task}</li>)}</ul></div>
        <div><h3 className="font-bold">Bảng dữ liệu trống</h3><p className="text-sm">Cột: {content.dataTable.columns.map((c) => `${c.name}${c.unit ? ` (${c.unit})` : ''}`).join('; ')}. Lượt đo: {content.dataTable.datasetLabels.join(', ')}.</p><p className="text-sm text-slate-700">{content.dataTable.note}</p></div>
        <div className="rounded-lg border border-amber-500 bg-amber-50 p-3 text-sm"><b>Lưu ý an toàn:</b> {content.safety}</div>
        <L title="Hướng dẫn dụng cụ" items={content.toolNotes} />
        <div><h3 className="font-bold">Gợi ý phân hóa</h3><p className="text-sm"><b>Cơ bản:</b> {content.differentiation.basic}</p><p className="text-sm"><b>Nâng cao:</b> {content.differentiation.advanced}</p></div>
        <L title="Yêu cầu Arts (STEAM)" items={content.steamFocus} />
      </div>
    </Shell>
  );
}
