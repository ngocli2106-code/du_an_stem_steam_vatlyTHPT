'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/client';
import { STAGES, stageName } from '@/lib/stages';
import { rescaleWeights, totalWeight, USER_CENTERED_CRITERION, validateRubric, type Rubric, type RubricCriterion, LEVEL_NAMES } from '@/lib/rubric';
import type { Kind, Mode, ProjectContent } from '@/lib/types';

export interface FormInitial {
  title: string; grade: number; mode: Mode; goals: string; content: ProjectContent; rubric: Rubric;
  templateId?: string | null; templateEditableId?: string | null;
}

function Lines({ id, label, value, onChange, rows = 3, hint }: { id: string; label: string; value: string[]; onChange: (v: string[]) => void; rows?: number; hint?: string }) {
  const [text, setText] = useState(value.join('\n'));
  return (
    <div>
      <label className="label" htmlFor={id}>{label}</label>
      {hint && <p className="hint mb-1">{hint}</p>}
      <textarea id={id} className="input" rows={rows} value={text} onChange={(e) => { setText(e.target.value); onChange(e.target.value.split('\n').map((x) => x.trim()).filter(Boolean)); }} />
    </div>
  );
}

export function ProjectForm({ purpose, initial, classes }: { purpose: 'assign' | 'template'; initial: FormInitial; classes?: { id: string; name: string; grade: number; groupCount: number }[] }) {
  const router = useRouter();
  const [title, setTitle] = useState(initial.title);
  const [grade, setGrade] = useState(initial.grade);
  const [mode, setMode] = useState<Mode>(initial.mode);
  const [goals, setGoals] = useState(initial.goals);
  const [content, setContent] = useState<ProjectContent>(initial.content);
  const [classId, setClassId] = useState(classes?.[0]?.id ?? '');
  const [kind, setKind] = useState<Kind>('FULL');
  const [weeks, setWeeks] = useState(4);
  const [due, setDue] = useState('');
  const [picked, setPicked] = useState<number[]>([5, 6]);
  const [stageDue, setStageDue] = useState<Record<number, string>>({});
  const [confirm, setConfirm] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [all, setAll] = useState<(RubricCriterion & { on: boolean })[]>(() => {
    const base = initial.rubric.criteria.map((c) => ({ ...c, on: true }));
    return base;
  });
  const rubric: Rubric = useMemo(() => ({ criteria: all.filter((c) => c.on).map((c) => ({ id: c.id, name: c.name, weight: c.weight, stageKeys: c.stageKeys, levels: c.levels })) }), [all]);
  const total = totalWeight(rubric);
  const stageKeys = kind === 'FULL' ? [1, 2, 3, 4, 5, 6, 7] : [...picked].sort();
  const rubricErrors = useMemo(() => validateRubric(rubric), [rubric]);

  const setC = (patch: Partial<ProjectContent>) => setContent((c) => ({ ...c, ...patch }));
  const upCrit = (i: number, p: Partial<RubricCriterion>) => { setAll((a) => a.map((c, j) => (j === i ? { ...c, ...p } : c))); setConfirm(false); };

  function applyShort(keys: number[]) {
    const next = all.map((c) => ({ ...c, on: c.stageKeys.length === 0 || c.stageKeys.some((k) => keys.includes(k)) }));
    const on = rescaleWeights(next.filter((c) => c.on));
    setAll(next.map((c) => ({ ...c, weight: on.find((o) => o.id === c.id)?.weight ?? c.weight })));
    setConfirm(false);
  }
  function togglePick(k: number) {
    const keys = picked.includes(k) ? picked.filter((x) => x !== k) : [...picked, k];
    setPicked(keys); applyShort(keys);
  }
  function setKindTo(k: Kind) {
    setKind(k);
    if (k === 'SHORT') applyShort(picked);
    else { setAll(initial.rubric.criteria.map((c) => ({ ...c, on: true }))); setConfirm(false); }
  }
  const rescale = () => {
    const on = rescaleWeights(all.filter((c) => c.on));
    setAll(all.map((c) => ({ ...c, weight: on.find((o) => o.id === c.id)?.weight ?? c.weight }))); setConfirm(false);
  };
  function addSteam() {
    if (all.some((c) => c.id === USER_CENTERED_CRITERION.id)) return;
    setAll([...all, { ...USER_CENTERED_CRITERION, on: true }]);
  }
  function addCustom() {
    setAll([...all, { id: `x${Date.now().toString(36)}`, name: 'Tiêu chí mới', weight: 0, stageKeys: [], levels: ['', '', '', ''], on: true }]);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(null); setBusy(true);
    try {
      if (purpose === 'template') {
        const body = { title, grade, mode, content, rubric };
        if (initial.templateEditableId) await api(`/api/templates/${initial.templateEditableId}`, 'PUT', body);
        else await api('/api/templates', 'POST', body);
        router.push('/teacher/templates'); router.refresh();
      } else {
        const r = await api<{ id: string }>('/api/projects', 'POST', {
          classId, templateId: initial.templateId ?? null, title, mode, kind, grade, goals, durationWeeks: weeks, dueDate: due,
          stages: stageKeys.map((k) => ({ key: k, dueDate: stageDue[k] || null })), content, rubric, confirmRubric: confirm,
        });
        router.push(`/teacher/projects/${r.id}`); router.refresh();
      }
    } catch (e) { setErr(e instanceof ApiError ? e.message : 'Có lỗi xảy ra.'); setBusy(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  }

  const cls = classes?.find((c) => c.id === classId);
  return (
    <form onSubmit={submit} className="space-y-5">
      {err && <p role="alert" className="rounded-lg border border-rose-500 bg-rose-50 p-3 text-sm text-rose-900">{err}</p>}

      <section className="card space-y-4" aria-labelledby="s-basic">
        <h2 id="s-basic" className="text-lg font-bold">1. Thông tin dự án</h2>
        {purpose === 'assign' && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label htmlFor="pf-class" className="label">Lớp nhận dự án</label>
              <select id="pf-class" className="input" value={classId} onChange={(e) => setClassId(e.target.value)} required>
                {classes?.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.groupCount} nhóm)</option>)}</select>
              {cls && cls.groupCount === 0 && <p role="alert" className="mt-1 text-sm text-rose-800">Lớp này chưa có nhóm. Hãy chia nhóm trước.</p>}</div>
            <fieldset><legend className="label">Hình thức</legend>
              <label className="mr-4 inline-flex min-h-[44px] items-center gap-2"><input type="radio" name="kind" checked={kind === 'FULL'} onChange={() => setKindTo('FULL')} /> Dự án đầy đủ (7 chặng)</label>
              <label className="inline-flex min-h-[44px] items-center gap-2"><input type="radio" name="kind" checked={kind === 'SHORT'} onChange={() => setKindTo('SHORT')} /> Nhiệm vụ ngắn</label></fieldset>
          </div>
        )}
        <div><label htmlFor="pf-title" className="label">Tên dự án</label><input id="pf-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div><label htmlFor="pf-grade" className="label">Khối lớp (gợi ý)</label>
            <select id="pf-grade" className="input" value={grade} onChange={(e) => setGrade(Number(e.target.value))}>{[10, 11, 12].map((g) => <option key={g} value={g}>Lớp {g}</option>)}</select></div>
          <div><label htmlFor="pf-mode" className="label">Cấu hình</label>
            <select id="pf-mode" className="input" value={mode} onChange={(e) => setMode(e.target.value as Mode)}><option value="STEM">STEM</option><option value="STEAM">STEAM (có yêu cầu Arts)</option></select></div>
          {purpose === 'assign' && <div><label htmlFor="pf-weeks" className="label">Thời lượng (tuần)</label><input id="pf-weeks" type="number" min={0} max={30} className="input" value={weeks} onChange={(e) => setWeeks(Number(e.target.value))} /></div>}
        </div>
        <div><label htmlFor="pf-goals" className="label">Mục tiêu</label><textarea id="pf-goals" className="input" rows={3} value={goals} onChange={(e) => setGoals(e.target.value)} /></div>
        {purpose === 'assign' && (
          <div className="max-w-xs"><label htmlFor="pf-due" className="label">Hạn nộp cuối của dự án</label><input id="pf-due" type="date" className="input" value={due} onChange={(e) => setDue(e.target.value)} required /></div>
        )}
      </section>

      {purpose === 'assign' && (
        <section className="card space-y-3" aria-labelledby="s-stages">
          <h2 id="s-stages" className="text-lg font-bold">2. Các chặng được giao</h2>
          {kind === 'SHORT' && <p className="hint">Chọn những chặng cần giao (ví dụ chỉ “Thử nghiệm” và “Phân tích và cải tiến”). Rubric sẽ tự chọn các tiêu chí phù hợp.</p>}
          <ul className="grid gap-2 md:grid-cols-2">
            {STAGES.map((s) => {
              const on = stageKeys.includes(s.key);
              return (
                <li key={s.key} className={`flex flex-wrap items-center gap-2 rounded-lg border p-2 ${on ? 'border-brand-600 bg-brand-50' : 'border-slate-300'}`}>
                  <label className="inline-flex min-h-[44px] flex-1 items-center gap-2 font-semibold">
                    <input type="checkbox" checked={on} disabled={kind === 'FULL'} onChange={() => togglePick(s.key)} />{s.key}. {s.name}</label>
                  {on && <><label className="sr-only" htmlFor={`sd-${s.key}`}>Hạn chặng {s.name}</label>
                    <input id={`sd-${s.key}`} type="date" className="input !min-h-[36px] !w-40 !py-1" value={stageDue[s.key] ?? ''} onChange={(e) => setStageDue({ ...stageDue, [s.key]: e.target.value })} /></>}
                </li>
              );
            })}
          </ul>
          <p className="hint">Để trống hạn của chặng thì dùng hạn nộp cuối của dự án.</p>
        </section>
      )}

      <details className="card" open={purpose === 'template'}>
        <summary className="cursor-pointer text-lg font-bold">3. Nội dung hướng dẫn cho học sinh (có thể chỉnh)</summary>
        <div className="mt-4 space-y-4">
          <div><label htmlFor="c-sit" className="label">Tình huống</label><textarea id="c-sit" className="input" rows={4} value={content.situation} onChange={(e) => setC({ situation: e.target.value })} /></div>
          <Lines id="c-req" label="Yêu cầu sản phẩm (mỗi dòng một ý)" value={content.productRequirements} onChange={(v) => setC({ productRequirements: v })} />
          <Lines id="c-bg" label="Kiến thức nền (mỗi dòng một ý)" value={content.background} onChange={(v) => setC({ background: v })} />
          <Lines id="c-mat" label="Vật liệu phổ thông (mỗi dòng một vật liệu)" value={content.materials} onChange={(v) => setC({ materials: v })} />
          <Lines id="c-succ" label="Tiêu chí thành công (đo được hoặc có thang quan sát rõ)" value={content.criteria.filter((c) => c.type === 'success').map((c) => c.text)}
            onChange={(v) => setC({ criteria: [...v.map((text) => ({ text, type: 'success' as const })), ...content.criteria.filter((c) => c.type === 'constraint')] })} />
          <Lines id="c-cons" label="Ràng buộc (chi phí, kích thước, thời gian, vật liệu)" value={content.criteria.filter((c) => c.type === 'constraint').map((c) => c.text)}
            onChange={(v) => setC({ criteria: [...content.criteria.filter((c) => c.type === 'success'), ...v.map((text) => ({ text, type: 'constraint' as const }))] })} />
          <Lines id="c-q" label="Câu hỏi gợi mở (khuyến nghị 3 câu)" value={content.guidingQuestions} onChange={(v) => setC({ guidingQuestions: v })} />
          <div><label htmlFor="c-safe" className="label">Lưu ý an toàn</label><textarea id="c-safe" className="input" rows={3} value={content.safety} onChange={(e) => setC({ safety: e.target.value })} /></div>
          <Lines id="c-tool" label="Hướng dẫn sử dụng dụng cụ (mỗi dòng một ý)" value={content.toolNotes} onChange={(v) => setC({ toolNotes: v })} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label htmlFor="c-d1" className="label">Phân hóa – mức cơ bản</label><textarea id="c-d1" className="input" rows={3} value={content.differentiation.basic} onChange={(e) => setC({ differentiation: { ...content.differentiation, basic: e.target.value } })} /></div>
            <div><label htmlFor="c-d2" className="label">Phân hóa – mức nâng cao</label><textarea id="c-d2" className="input" rows={3} value={content.differentiation.advanced} onChange={(e) => setC({ differentiation: { ...content.differentiation, advanced: e.target.value } })} /></div>
          </div>
          {mode === 'STEAM' && <Lines id="c-arts" label="Yêu cầu Arts (STEAM)" value={content.steamFocus} onChange={(v) => setC({ steamFocus: v })} />}
          <fieldset className="space-y-3 rounded-lg border border-slate-300 p-3"><legend className="px-1 text-sm font-bold">Nhiệm vụ và minh chứng theo chặng</legend>
            {STAGES.filter((s) => purpose === 'template' || stageKeys.includes(s.key)).map((s) => {
              const st = content.stages[String(s.key)] ?? { task: '', evidence: [] };
              const set = (p: Partial<typeof st>) => setC({ stages: { ...content.stages, [String(s.key)]: { ...st, ...p } } });
              return (
                <div key={s.key} className="space-y-2 border-t border-slate-200 pt-2 first:border-0 first:pt-0">
                  <label htmlFor={`st-${s.key}`} className="label">{s.key}. {s.name} – nhiệm vụ</label>
                  <textarea id={`st-${s.key}`} className="input" rows={2} value={st.task} onChange={(e) => set({ task: e.target.value })} />
                  <Lines id={`se-${s.key}`} label="Yêu cầu minh chứng (mỗi dòng một yêu cầu)" rows={2} value={st.evidence} onChange={(v) => set({ evidence: v })} />
                </div>
              );
            })}
          </fieldset>
          <fieldset className="space-y-3 rounded-lg border border-slate-300 p-3"><legend className="px-1 text-sm font-bold">Bảng dữ liệu trống cho chặng Thử nghiệm</legend>
            <div className="space-y-2">
              {content.dataTable.columns.map((c, i) => (
                <div key={i} className="grid gap-2 sm:grid-cols-[1fr_120px_130px_auto]">
                  <input aria-label={`Tên cột ${i + 1}`} className="input" value={c.name} placeholder="Tên đại lượng"
                    onChange={(e) => setC({ dataTable: { ...content.dataTable, columns: content.dataTable.columns.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) } })} />
                  <input aria-label={`Đơn vị cột ${i + 1}`} className="input" value={c.unit} placeholder="Đơn vị"
                    onChange={(e) => setC({ dataTable: { ...content.dataTable, columns: content.dataTable.columns.map((x, j) => (j === i ? { ...x, unit: e.target.value } : x)) } })} />
                  <select aria-label={`Kiểu cột ${i + 1}`} className="input" value={c.type}
                    onChange={(e) => setC({ dataTable: { ...content.dataTable, columns: content.dataTable.columns.map((x, j) => (j === i ? { ...x, type: e.target.value as 'number' | 'text' } : x)) } })}>
                    <option value="number">Số</option><option value="text">Văn bản</option></select>
                  <button type="button" className="btn-danger btn btn-sm" disabled={content.dataTable.columns.length <= 1}
                    onClick={() => setC({ dataTable: { ...content.dataTable, columns: content.dataTable.columns.filter((_, j) => j !== i) } })}>Xoá cột</button>
                </div>
              ))}
              <button type="button" className="btn-secondary btn btn-sm" disabled={content.dataTable.columns.length >= 12}
                onClick={() => setC({ dataTable: { ...content.dataTable, columns: [...content.dataTable.columns, { name: '', unit: '', type: 'number' }] } })}>+ Thêm cột</button>
            </div>
            <Lines id="dt-l" label="Tên các lượt/phương án đo (mỗi dòng một lượt)" rows={3} value={content.dataTable.datasetLabels} onChange={(v) => setC({ dataTable: { ...content.dataTable, datasetLabels: v.length ? v : ['Phương án A'] } })} />
            <Lines id="dt-k" label="Điều kiện đo cần ghi (mỗi dòng một điều kiện)" rows={3} value={content.dataTable.conditionKeys} onChange={(v) => setC({ dataTable: { ...content.dataTable, conditionKeys: v } })} />
            <div className="grid gap-3 sm:grid-cols-3">
              <div><label htmlFor="dt-r" className="label">Số dòng trống ban đầu</label><input id="dt-r" type="number" min={1} max={30} className="input" value={content.dataTable.defaultRows} onChange={(e) => setC({ dataTable: { ...content.dataTable, defaultRows: Math.max(1, Math.min(30, Number(e.target.value) || 1)) } })} /></div>
              <div><label htmlFor="dt-x" className="label">Đồ thị gợi ý: trục ngang</label><input id="dt-x" className="input" value={content.chartHint.x} onChange={(e) => setC({ chartHint: { ...content.chartHint, x: e.target.value } })} /></div>
              <div><label htmlFor="dt-y" className="label">Đồ thị gợi ý: trục dọc</label><input id="dt-y" className="input" value={content.chartHint.y} onChange={(e) => setC({ chartHint: { ...content.chartHint, y: e.target.value } })} /></div>
            </div>
            <div><label htmlFor="dt-n" className="label">Ghi chú về phép đo (ví dụ giới hạn của thiết bị)</label><textarea id="dt-n" className="input" rows={2} value={content.dataTable.note} onChange={(e) => setC({ dataTable: { ...content.dataTable, note: e.target.value } })} /></div>
          </fieldset>
        </div>
      </details>

      <section className="card space-y-3" aria-labelledby="s-rub">
        <h2 id="s-rub" className="text-lg font-bold">4. Rubric (thang 100 điểm)</h2>
        <p className="hint">Hệ số theo mức: {LEVEL_NAMES.map((n, i) => `${n.split(' – ')[0]} = ${[0, 0.5, 0.75, 1][i].toString().replace('.', ',')}`).join(' · ')}. Bản rubric được lưu kèm dự án khi giao, nên sửa mẫu sau này không đổi điểm cũ.</p>
        <div className={`rounded-lg border p-2 text-sm font-semibold ${total === 100 ? 'border-emerald-500 bg-emerald-50 text-emerald-900' : 'border-rose-500 bg-rose-50 text-rose-900'}`} role="status">
          Tổng trọng số: {String(total).replace('.', ',')} / 100 {total === 100 ? '✓' : '— cần đúng 100'}
        </div>
        <div className="space-y-3">
          {all.map((c, i) => (
            <div key={c.id} className={`rounded-lg border p-3 ${c.on ? 'border-slate-400' : 'border-slate-200 bg-slate-50 opacity-70'}`}>
              <div className="grid items-end gap-2 sm:grid-cols-[auto_1fr_110px]">
                <label className="inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={c.on} onChange={(e) => upCrit(i, { on: e.target.checked } as any)} /> Dùng</label>
                <div><label className="label" htmlFor={`rn-${i}`}>Tên tiêu chí</label><input id={`rn-${i}`} className="input" value={c.name} onChange={(e) => upCrit(i, { name: e.target.value })} /></div>
                <div><label className="label" htmlFor={`rw-${i}`}>Trọng số</label><input id={`rw-${i}`} type="number" min={0} max={100} step="any" className="input" value={c.weight} disabled={!c.on} onChange={(e) => upCrit(i, { weight: Number(e.target.value) })} /></div>
              </div>
              <p className="mt-1 text-xs text-slate-700">Gắn với chặng: {c.stageKeys.length ? c.stageKeys.map((k) => `${k}. ${stageName(k)}`).join(', ') : 'không gắn chặng cụ thể'}</p>
              <details className="mt-2"><summary className="cursor-pointer text-sm font-semibold text-brand-700">Mô tả 4 mức</summary>
                <div className="mt-2 space-y-2">{c.levels.map((l, j) => (
                  <div key={j}><label className="label" htmlFor={`rl-${i}-${j}`}>{LEVEL_NAMES[j]}</label>
                    <textarea id={`rl-${i}-${j}`} className="input" rows={2} value={l} onChange={(e) => upCrit(i, { levels: c.levels.map((x, k) => (k === j ? e.target.value : x)) as RubricCriterion['levels'] })} /></div>))}</div></details>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary btn" onClick={rescale}>Chia lại trọng số về 100</button>
          {mode === 'STEAM' && !all.some((c) => c.id === USER_CENTERED_CRITERION.id) && <button type="button" className="btn-secondary btn" onClick={addSteam}>+ Thêm tiêu chí “Thiết kế hướng tới người dùng”</button>}
          <button type="button" className="btn-secondary btn" onClick={addCustom}>+ Thêm tiêu chí khác</button>
        </div>
        {rubricErrors.length > 0 && <ul className="list-disc pl-5 text-sm text-rose-900">{rubricErrors.map((e, i) => <li key={i}>{e}</li>)}</ul>}
        {purpose === 'assign' && kind === 'SHORT' && (
          <label className="flex min-h-[44px] items-start gap-2 rounded-lg border border-amber-500 bg-amber-50 p-3 text-sm font-semibold">
            <input type="checkbox" className="mt-1" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} />
            Tôi đã xem và xác nhận thang điểm cho nhiệm vụ ngắn này ({rubric.criteria.length} tiêu chí, tổng {String(total).replace('.', ',')} điểm).
          </label>
        )}
      </section>

      <div className="flex flex-wrap gap-2">
        <button className="btn-primary btn" disabled={busy || rubricErrors.length > 0 || (purpose === 'assign' && (kind === 'SHORT' && !confirm || !due || !classId))}>
          {busy ? 'Đang lưu…' : purpose === 'assign' ? 'Giao dự án cho lớp' : 'Lưu mẫu'}
        </button>
        <button type="button" className="btn-secondary btn" onClick={() => router.back()}>Huỷ</button>
      </div>
    </form>
  );
}
