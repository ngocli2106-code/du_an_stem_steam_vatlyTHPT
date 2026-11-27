import type { Series } from '@/lib/dataset';
import { formatNumberVi } from '@/lib/numbers';
import { niceScale } from '@/lib/scale';

const COLORS = ['#1d4ed8', '#c2410c', '#047857', '#7e22ce', '#be123c', '#0f766e'];
const DASH = ['', '6 4', '2 3', '10 3 2 3', '', '6 4'];

function Marker({ i, x, y, color }: { i: number; x: number; y: number; color: string }) {
  const s = 5;
  const k = i % 3;
  if (k === 0) return <circle cx={x} cy={y} r={s} fill={color} stroke="#fff" strokeWidth={1} />;
  if (k === 1) return <rect x={x - s} y={y - s} width={s * 2} height={s * 2} fill={color} stroke="#fff" strokeWidth={1} />;
  return <polygon points={`${x},${y - s - 1} ${x + s + 1},${y + s} ${x - s - 1},${y + s}`} fill={color} stroke="#fff" strokeWidth={1} />;
}

/** Đồ thị đường–điểm bằng SVG thuần: dùng được cả khi in. Ô trống không được vẽ như số 0. */
export function LineChart({ series, xLabel, yLabel, title }: { series: Series[]; xLabel: string; yLabel: string; title?: string }) {
  const W = 640, H = 360, L = 64, R = 20, T = 20, B = 56;
  const all = series.flatMap((s) => s.points);
  if (all.length === 0) {
    return <p className="rounded-lg border border-dashed border-slate-400 bg-slate-50 p-4 text-sm text-slate-700">Chưa có điểm dữ liệu hợp lệ để vẽ đồ thị. Hãy nhập số vào cả hai cột đã chọn (ô trống không được tính là 0).</p>;
  }
  const xs = niceScale(Math.min(...all.map((p) => p.x)), Math.max(...all.map((p) => p.x)));
  const ys = niceScale(Math.min(...all.map((p) => p.y)), Math.max(...all.map((p) => p.y)));
  const px = (x: number) => L + ((x - xs.lo) / (xs.hi - xs.lo)) * (W - L - R);
  const py = (y: number) => T + (1 - (y - ys.lo) / (ys.hi - ys.lo)) * (H - T - B);
  const desc = series.map((s) => `${s.label}: ${s.points.length} điểm`).join('; ');
  return (
    <figure className="avoid-break print-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Đồ thị ${yLabel} theo ${xLabel}. ${desc}`} className="h-auto w-full max-w-2xl rounded-lg border border-slate-300 bg-white">
        {title && <title>{title}</title>}
        {ys.ticks.map((t) => (
          <g key={`y${t}`}>
            <line x1={L} x2={W - R} y1={py(t)} y2={py(t)} stroke="#e2e8f0" />
            <text x={L - 8} y={py(t) + 4} textAnchor="end" fontSize="12" fill="#334155">{formatNumberVi(t)}</text>
          </g>
        ))}
        {xs.ticks.map((t) => (
          <g key={`x${t}`}>
            <line x1={px(t)} x2={px(t)} y1={T} y2={H - B} stroke="#f1f5f9" />
            <text x={px(t)} y={H - B + 18} textAnchor="middle" fontSize="12" fill="#334155">{formatNumberVi(t)}</text>
          </g>
        ))}
        <line x1={L} x2={L} y1={T} y2={H - B} stroke="#334155" />
        <line x1={L} x2={W - R} y1={H - B} y2={H - B} stroke="#334155" />
        <text x={(L + W - R) / 2} y={H - 10} textAnchor="middle" fontSize="13" fontWeight="600" fill="#0f172a">{xLabel}</text>
        <text transform={`translate(16 ${(T + H - B) / 2}) rotate(-90)`} textAnchor="middle" fontSize="13" fontWeight="600" fill="#0f172a">{yLabel}</text>
        {series.map((s, i) => (
          <g key={i}>
            {s.points.length > 1 && (
              <polyline fill="none" stroke={COLORS[i % COLORS.length]} strokeWidth={2} strokeDasharray={DASH[i % DASH.length]}
                points={s.points.map((p) => `${px(p.x)},${py(p.y)}`).join(' ')} />
            )}
            {s.points.map((p, j) => <Marker key={j} i={i} x={px(p.x)} y={py(p.y)} color={COLORS[i % COLORS.length]} />)}
          </g>
        ))}
      </svg>
      <figcaption className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-800">
        {series.map((s, i) => (
          <span key={i} className="inline-flex items-center gap-1.5">
            <svg width="26" height="12" aria-hidden="true">
              <line x1="0" x2="26" y1="6" y2="6" stroke={COLORS[i % COLORS.length]} strokeWidth="2" strokeDasharray={DASH[i % DASH.length]} />
              <Marker i={i} x={13} y={6} color={COLORS[i % COLORS.length]} />
            </svg>
            {s.label || `Lượt ${i + 1}`}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
