import Link from 'next/link';
import { prisma } from '@/lib/db';
import { Shell, requirePageUser } from '@/components/Shell';
import { DemoBadge, Empty, PageHeader, StatusBadge } from '@/components/ui';
import { loadGroupView, nextAction } from '@/lib/group-view';
import { fmtDate } from '@/lib/progress';
import { stageName } from '@/lib/stages';

export const dynamic = 'force-dynamic';

const VERB = { revise: 'Chỉnh sửa và nộp lại', continue: 'Tiếp tục làm', start: 'Bắt đầu làm', wait: 'Đang chờ giáo viên phản hồi' } as const;

export default async function StudentHome() {
  const user = await requirePageUser('STUDENT');
  const gms = await prisma.groupMember.findMany({ where: { userId: user.id }, include: { group: { include: { projectGroups: { select: { id: true }, orderBy: { id: 'asc' } } } } } });
  const ids = gms.flatMap((g) => g.group.projectGroups.map((p) => p.id));
  const views = await Promise.all(ids.map((id) => loadGroupView(user, id)));
  views.sort((a, b) => +b.project.createdAt - +a.project.createdAt);
  return (
    <Shell user={user}>
      <PageHeader title={`Xin chào, ${user.displayName}`} sub="Việc tiếp theo của nhóm bạn nằm ngay bên dưới." />
      {views.length === 0 ? <Empty title="Nhóm của bạn chưa được giao dự án nào">Khi giáo viên giao dự án, bạn sẽ thấy ở đây. Nếu chưa có nhóm, hãy báo giáo viên.</Empty> : (
        <div className="space-y-6">
          {views.map((v) => {
            const na = nextAction(v.stages);
            const lastRev = na?.kind === 'revise' ? [...na.stage.feedbacks].reverse().find((f) => f.kind === 'REVISION') : null;
            return (
              <section key={v.pg.id} className="space-y-3" aria-labelledby={`pr-${v.pg.id}`}>
                <h2 id={`pr-${v.pg.id}`} className="text-lg font-bold">{v.project.title} <span className="text-sm font-normal text-slate-700">· {v.groupName}</span> {v.project.isDemo && <DemoBadge />}</h2>
                {na ? (
                  <div className="card border-2 border-brand-600">
                    <p className="text-xs font-bold uppercase tracking-wide text-brand-700">Việc tiếp theo</p>
                    <p className="text-xl font-bold">{na.stage.key}. {stageName(na.stage.key)}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-sm"><StatusBadge status={na.stage.status} overdue={na.stage.overdue} /> Hạn nộp: <strong>{fmtDate(na.stage.due)}</strong></p>
                    {lastRev && <blockquote className="mt-2 rounded-lg border-l-4 border-rose-500 bg-rose-50 p-3 text-sm"><span className="font-semibold">Phản hồi của giáo viên:</span> {lastRev.text}</blockquote>}
                    <Link href={`/student/p/${v.pg.id}/stage/${na.stage.key}`} className="btn-primary btn mt-3">{VERB[na.kind]}</Link>
                  </div>
                ) : <p className="card">Nhóm đã hoàn thành các chặng được giao. 🎉</p>}
                {v.published && <p className="card border-emerald-500 bg-emerald-50"><strong>Kết quả đã được công bố:</strong> {String(v.published.total).replace('.', ',')}/100 điểm. <Link className="underline" href={`/student/p/${v.pg.id}`}>Xem chi tiết</Link></p>}
                <p><Link className="btn-secondary btn" href={`/student/p/${v.pg.id}`}>Mở hồ sơ nhóm</Link></p>
              </section>
            );
          })}
        </div>
      )}
    </Shell>
  );
}
