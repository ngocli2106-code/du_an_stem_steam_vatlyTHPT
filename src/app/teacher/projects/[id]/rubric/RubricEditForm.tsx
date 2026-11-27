'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError } from '@/lib/client';
import { criteriaOutsideStages, validateRubric, type Rubric } from '@/lib/rubric';
import { RubricEditor, toRubric, type EditableCriterion } from '@/components/forms/RubricEditor';
import type { Kind, Mode } from '@/lib/types';

interface Props {
  projectId: string; mode: Mode; kind: Kind; version: number; rubric: Rubric; stageKeys: number[];
  groups: number; draftGroups: number; publishedGroups: number; stalePublished: number; scoredCount: Record<string, number>;
}

export function RubricEditForm(p: Props) {
  const router = useRouter();
  const [items, setItems] = useState<EditableCriterion[]>(p.rubric.criteria.map((c) => ({ ...c, on: true })));
  const [msg, setMsg] = useState<{ ok: boolean; t: string; conflict?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const rubric = useMemo(() => toRubric(items), [items]);
  const errors = useMemo(() => {
    const e = validateRubric(rubric);
    if (p.kind === 'SHORT') {
      const bad = criteriaOutsideStages(rubric, p.stageKeys);
      if (bad.length) e.push(`Nhiệm vụ ngắn: tiêu chí không gắn với chặng được giao (${bad.map((c) => c.name).join(', ')}). Hãy bỏ chọn hoặc đặt trọng số 0.`);
    }
    return e;
  }, [rubric, p.kind, p.stageKeys]);
  const unchanged = JSON.stringify(rubric) === JSON.stringify(p.rubric);

  // Tóm tắt thay đổi để giáo viên xác nhận.
  const before = new Map(p.rubric.criteria.map((c) => [c.id, c]));
  const removed = p.rubric.criteria.filter((c) => !rubric.criteria.some((x) => x.id === c.id));
  const added = rubric.criteria.filter((c) => !before.has(c.id));
  const reweighted = rubric.criteria.filter((c) => before.has(c.id) && before.get(c.id)!.weight !== c.weight);
  const relabeled = rubric.criteria.filter((c) => before.has(c.id) && JSON.stringify(before.get(c.id)!.levels) !== JSON.stringify(c.levels));
  const lostScores = removed.reduce((a, c) => a + (p.scoredCount[c.id] ?? 0), 0);

  async function save() {
    const lines = [
      removed.length && `Xoá ${removed.length} tiêu chí${lostScores ? ` (mất điểm nháp đã chấm ở ${lostScores} lượt chấm)` : ''}: ${removed.map((c) => c.name).join(', ')}`,
      added.length && `Thêm ${added.length} tiêu chí: ${added.map((c) => c.name).join(', ')} — các nhóm cần được chấm thêm`,
      reweighted.length && `Đổi trọng số ${reweighted.length} tiêu chí — điểm nháp được tính lại theo trọng số mới`,
      relabeled.length && `Sửa mô tả mức của ${relabeled.length} tiêu chí — mức đã chấm được giữ nguyên, hãy rà lại`,
      p.publishedGroups > 0 && `${p.publishedGroups} nhóm đã công bố: học sinh vẫn thấy kết quả cũ cho tới khi bạn công bố lại`,
    ].filter(Boolean);
    if (!confirm(`Lưu rubric mới?\n\n- ${lines.join('\n- ') || 'Chỉ đổi tên tiêu chí.'}`)) return;
    setBusy(true); setMsg(null);
    try {
      const r = await api<{ version: number }>(`/api/projects/${p.projectId}/rubric`, 'PUT', { baseVersion: p.version, rubric });
      setMsg({ ok: true, t: `Đã lưu rubric (phiên bản ${r.version}).` });
      router.push(`/teacher/projects/${p.projectId}`); router.refresh();
    } catch (e) {
      setMsg({ ok: false, t: e instanceof ApiError ? e.message : 'Không lưu được. Nội dung vẫn còn trên màn hình, hãy thử lại.', conflict: e instanceof ApiError && e.status === 409 });
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="card space-y-2 text-sm" aria-label="Tác động tới điểm">
        <h2 className="text-base font-bold">Tác động tới điểm</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>{p.draftGroups}/{p.groups} nhóm có điểm nháp. Mức đã chấm của tiêu chí còn giữ lại được giữ nguyên và tính lại theo trọng số mới; điểm của tiêu chí bị xoá sẽ mất.</li>
          <li>{p.publishedGroups}/{p.groups} nhóm đã công bố. Kết quả đã công bố <b>không tự đổi</b>: học sinh vẫn thấy bản cũ cho tới khi bạn mở hồ sơ nhóm và công bố lại.</li>
          {p.stalePublished > 0 && <li className="text-amber-900">{p.stalePublished} nhóm hiện đang có kết quả công bố theo rubric cũ.</li>}
          <li>Mẫu dự án gốc không bị thay đổi.</li>
        </ul>
      </section>
      <section className="card space-y-3" aria-labelledby="rb-h">
        <h2 id="rb-h" className="text-lg font-bold">Rubric (thang 100 điểm)</h2>
        <RubricEditor items={items} onChange={(v) => { setItems(v); setMsg(null); }} mode={p.mode} errors={errors}
          note={(c) => (p.scoredCount[c.id] ? <p className="mt-1 text-xs text-slate-700">Đã chấm nháp ở {p.scoredCount[c.id]} nhóm{!c.on ? ' — bỏ chọn sẽ xoá các điểm này' : ''}.</p> : null)} />
      </section>
      <div aria-live="polite">{msg && (
        <p role={msg.ok ? 'status' : 'alert'} className={`rounded-lg border p-3 text-sm font-semibold ${msg.ok ? 'border-emerald-500 bg-emerald-50 text-emerald-900' : 'border-rose-500 bg-rose-50 text-rose-900'}`}>
          {msg.t} {msg.conflict && <button className="underline" onClick={() => window.location.reload()}>Tải lại</button>}
        </p>)}</div>
      <div className="flex flex-wrap gap-2">
        <button className="btn-primary btn" onClick={save} disabled={busy || errors.length > 0 || unchanged}>{busy ? 'Đang lưu…' : 'Lưu rubric'}</button>
        <Link href={`/teacher/projects/${p.projectId}`} className="btn-secondary btn">Huỷ</Link>
        {unchanged && <span className="self-center text-sm text-slate-700">Chưa có thay đổi.</span>}
      </div>
    </div>
  );
}
