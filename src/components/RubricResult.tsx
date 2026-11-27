import { LEVEL_NAMES, type PublishedResult, type Rubric } from '@/lib/rubric';
import { formatNumberVi } from '@/lib/numbers';

export function RubricResult({ result, rubric }: { result: PublishedResult; rubric: Rubric }) {
  return (
    <div className="avoid-break">
      <div className="overflow-x-auto">
        <table className="data-table w-full border-collapse text-sm">
          <thead><tr className="bg-slate-100">
            <th className="border border-slate-400 px-2 py-1 text-left">Tiêu chí</th><th className="border border-slate-400 px-2 py-1">Mức</th>
            <th className="border border-slate-400 px-2 py-1">Hệ số</th><th className="border border-slate-400 px-2 py-1">Điểm / Tối đa</th><th className="border border-slate-400 px-2 py-1 text-left">Nhận xét</th>
          </tr></thead>
          <tbody>
            {result.rows.map((r) => {
              const c = rubric.criteria.find((x) => x.id === r.id);
              return (
                <tr key={r.id}>
                  <td className="border border-slate-400 px-2 py-1 font-semibold">{r.name}</td>
                  <td className="border border-slate-400 px-2 py-1 text-center">{LEVEL_NAMES[r.level]}{c && <div className="text-xs font-normal text-slate-700">{c.levels[r.level]}</div>}</td>
                  <td className="border border-slate-400 px-2 py-1 text-center">{formatNumberVi(r.factor)}</td>
                  <td className="border border-slate-400 px-2 py-1 text-center">{formatNumberVi(r.score)} / {formatNumberVi(r.weight)}</td>
                  <td className="border border-slate-400 px-2 py-1">{r.comment}</td>
                </tr>
              );
            })}
            <tr className="bg-slate-50 font-bold"><td className="border border-slate-400 px-2 py-1" colSpan={3}>Tổng điểm</td><td className="border border-slate-400 px-2 py-1 text-center">{formatNumberVi(result.total)} / 100</td><td className="border border-slate-400" /></tr>
          </tbody>
        </table>
      </div>
      {result.overallComment && <p className="mt-2 text-sm"><span className="font-semibold">Nhận xét chung:</span> {result.overallComment}</p>}
      <p className="mt-1 text-xs text-slate-700">Điểm sản phẩm của nhóm; phần tự đánh giá và đóng góp cá nhân được hiển thị riêng.</p>
    </div>
  );
}
