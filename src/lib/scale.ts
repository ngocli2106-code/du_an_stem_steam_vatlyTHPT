export function niceScale(min: number, max: number, target = 5): { lo: number; hi: number; step: number; ticks: number[] } {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { lo: 0, hi: 1, step: 0.2, ticks: [0, 0.2, 0.4, 0.6, 0.8, 1] };
  if (min === max) { const d = min === 0 ? 1 : Math.abs(min) * 0.1; min -= d; max += d; }
  const raw = (max - min) / target;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + step / 1e6; v += step) ticks.push(Number(v.toFixed(10)));
  return { lo, hi, step, ticks };
}

