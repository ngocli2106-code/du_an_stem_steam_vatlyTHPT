import Link from 'next/link';
import { stageShort } from '@/lib/stages';
import type { OverviewRow } from '@/lib/overview';
import { STATUS_ICON, STATUS_LABEL, STATUS_STYLE } from '@/lib/types';
import { fmtDate } from '@/lib/progress';
import { DemoBadge } from './ui';

export function ProgressMatrix({ rows }: { rows: OverviewRow[] }) {
  // Nhóm theo dự án
  const byProject = new Map<string, OverviewRow[]>();
  for (const r of rows) byProject.set(r.projectId, [...(byProject.get(r.projectId) ?? []), r]);
  return (
    <div className="space-y-6">
      {[...byProject.entries()].map(([pid, list]) => {
        const keys = list[0].stageKeys;
        return (
          <section key={pid} aria-labelledby={`p-${pid}`} className="card overflow-hidden !p-0">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-300 bg-slate-50 px-4 py-3">
              <h2 id={`p-${pid}`} className="text-base font-bold">
                <Link href={`/teacher/projects/${pid}`} className="hover:underline">{list[0].projectTitle}</Link>
                <span className="ml-2 text-sm font-normal text-slate-700">Lớp {list[0].className}</span>
                {list[0].isDemo && <DemoBadge className="ml-2" />}
              </h2>
              <span className="text-xs text-slate-700">Chỉ tính trên {keys.length} chặng được giao</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead>
                  <tr className="text-left">
                    <th scope="col" className="px-3 py-2">Nhóm</th>
                    <th scope="col" className="px-3 py-2">Tiến độ</th>
                    {keys.map((k) => <th key={k} scope="col" className="px-2 py-2 text-center">{k}. {stageShort(k)}</th>)}
                    <th scope="col" className="px-3 py-2">Điểm</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((r) => (
                    <tr key={r.pgId} className="border-t border-slate-200 align-middle">
                      <th scope="row" className="px-3 py-2 text-left font-semibold">
                        <Link href={`/teacher/pg/${r.pgId}`} className="text-brand-700 underline">{r.groupName}</Link>
                        <div className="mt-0.5 flex flex-wrap gap-1 text-xs font-normal">
                          {r.summary.waiting > 0 && <span className="badge border-amber-500 bg-amber-50 text-amber-900">⏳ {r.summary.waiting} chờ phản hồi</span>}
                          {r.summary.needsRevision > 0 && <span className="badge border-rose-500 bg-rose-50 text-rose-900">↺ {r.summary.needsRevision} cần bổ sung</span>}
                          {r.summary.overdue > 0 && <span className="badge border-red-700 bg-red-50 text-red-900">! {r.summary.overdue} quá hạn</span>}
                        </div>
                      </th>
                      <td className="px-3 py-2">
                        <div className="text-xs font-semibold">{r.summary.done}/{r.summary.assigned} đã nộp/duyệt · {r.summary.approved} đã duyệt</div>
                        <div className="mt-1 h-2 w-28 rounded bg-slate-200" role="img" aria-label={`${r.summary.percentSubmitted}% chặng đã nộp hoặc duyệt`}>
                          <div className="h-2 rounded bg-brand-600" style={{ width: `${r.summary.percentSubmitted}%` }} />
                        </div>
                      </td>
                      {r.stages.map((s) => (
                        <td key={s.key} className="px-1 py-2 text-center">
                          <Link href={`/teacher/pg/${r.pgId}?stage=${s.key}`} title={`${STATUS_LABEL[s.status]}${s.overdue ? ' – quá hạn' : ''} (hạn ${fmtDate(s.due)})`}
                            className={`badge ${STATUS_STYLE[s.status]} ${s.overdue ? '!border-red-700 ring-2 ring-red-300' : ''}`}>
                            <span aria-hidden="true">{STATUS_ICON[s.status]}</span>
                            <span>{STATUS_LABEL[s.status]}</span>
                            {s.overdue && <span className="font-bold">· Quá hạn</span>}
                          </Link>
                        </td>
                      ))}
                      <td className="px-3 py-2 text-xs">{r.published ? (r.publishedStale ? <span className="badge border-amber-500 bg-amber-50 text-amber-900">Công bố theo rubric cũ</span> : <span className="badge border-emerald-500 bg-emerald-50 text-emerald-900">Đã công bố</span>) : <span className="text-slate-700">Chưa công bố</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}
