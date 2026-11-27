import { stageName } from '@/lib/stages';
import type { ProjectContent, Mode } from '@/lib/types';

export function ProjectBrief({ content: c, project, mode }: { content: ProjectContent; project: { goals: string; mode: string }; mode: Mode }) {
  const L = ({ t, items }: { t: string; items: string[] }) => items.length ? <div><h3 className="font-bold">{t}</h3><ul className="list-disc pl-5 text-sm">{items.map((x, i) => <li key={i}>{x}</li>)}</ul></div> : null;
  return (
    <section className="card space-y-4" aria-labelledby="brief">
      <h2 id="brief" className="text-lg font-bold">Hướng dẫn dự án ({mode})</h2>
      {project.goals && <div><h3 className="font-bold">Mục tiêu</h3><p className="whitespace-pre-wrap text-sm">{project.goals}</p></div>}
      {c.situation && <div><h3 className="font-bold">Tình huống</h3><p className="whitespace-pre-wrap text-sm">{c.situation}</p></div>}
      <L t="Yêu cầu sản phẩm" items={c.productRequirements} />
      <L t="Kiến thức nền" items={c.background} />
      <L t="Vật liệu gợi ý" items={c.materials} />
      <L t="Tiêu chí và ràng buộc của giáo viên (gợi ý)" items={c.criteria.map((x) => `${x.type === 'success' ? 'Tiêu chí: ' : 'Ràng buộc: '}${x.text}`)} />
      <L t="Câu hỏi gợi mở" items={c.guidingQuestions} />
      {c.safety && <div className="rounded-lg border border-amber-500 bg-amber-50 p-3 text-sm"><b>⚠ An toàn:</b> {c.safety}</div>}
      <L t="Hướng dẫn dụng cụ" items={c.toolNotes} />
      {(c.differentiation.basic || c.differentiation.advanced) && (
        <div><h3 className="font-bold">Hai mức nhiệm vụ</h3>
          <p className="text-sm"><b>Cơ bản:</b> {c.differentiation.basic}</p><p className="text-sm"><b>Nâng cao:</b> {c.differentiation.advanced}</p></div>
      )}
      {mode === 'STEAM' && <L t="Yêu cầu Arts (STEAM)" items={c.steamFocus} />}
      <div><h3 className="font-bold">Nhiệm vụ theo chặng</h3>
        <ul className="text-sm">{Object.entries(c.stages).map(([k, v]) => <li key={k}><b>{k}. {stageName(Number(k))}:</b> {v.task}</li>)}</ul></div>
    </section>
  );
}
