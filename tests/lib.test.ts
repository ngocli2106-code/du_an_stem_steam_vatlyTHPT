import { describe, expect, it } from 'vitest';
import { parseNumberVi, formatNumberVi } from '../src/lib/numbers';
import { buildSeries, columnMean, conditionDiffs, validateDatasets, type Column, type Dataset } from '../src/lib/dataset';
import { computeResult, criterionScore, DEFAULT_RUBRIC, rescaleWeights, totalWeight, validateRubric } from '../src/lib/rubric';
import { summarize } from '../src/lib/progress';
import { validateStage } from '../src/lib/validate';
import { sniffMime } from '../src/lib/storage';
import { parseStudentLines, slugVi } from '../src/lib/people';
import { niceScale } from '../src/lib/scale';

const cols: Column[] = [
  { id: 'a', name: 'Thời điểm', unit: 'phút', type: 'number' },
  { id: 'b', name: 'Nhiệt độ', unit: '°C', type: 'number' },
  { id: 'c', name: 'Ghi chú', unit: '', type: 'text' },
];
const ds = (rows: [string, string][], label = 'A', conditions: Dataset['conditions'] = []): Dataset => ({
  id: label, label, conditions, rows: rows.map((r, i) => ({ id: `r${i}`, cells: { a: r[0], b: r[1], c: '' }, note: '' })),
});

describe('parseNumberVi', () => {
  it('chấp nhận dấu phẩy và dấu chấm thập phân', () => {
    expect(parseNumberVi('12,5')).toEqual({ ok: true, value: 12.5 });
    expect(parseNumberVi('12.5')).toEqual({ ok: true, value: 12.5 });
    expect(parseNumberVi(' -0,25 ')).toEqual({ ok: true, value: -0.25 });
    expect(parseNumberVi(',5')).toEqual({ ok: true, value: 0.5 });
  });
  it('phân biệt số 0 với ô trống', () => {
    expect(parseNumberVi('0')).toEqual({ ok: true, value: 0 });
    expect(parseNumberVi('0,0')).toEqual({ ok: true, value: 0 });
    expect(parseNumberVi('')).toEqual({ ok: true, value: null });
    expect(parseNumberVi('   ')).toEqual({ ok: true, value: null });
    expect(parseNumberVi(undefined)).toEqual({ ok: true, value: null });
  });
  it('báo lỗi dữ liệu sai', () => {
    for (const bad of ['abc', '12 g', '1,2,3', '1.234,5', '1.', '--3', '1e3', '12,']) expect(parseNumberVi(bad).ok, bad).toBe(false);
  });
  it('định dạng kiểu Việt Nam', () => { expect(formatNumberVi(12.5)).toBe('12,5'); expect(formatNumberVi(0)).toBe('0'); });
});

describe('dataset', () => {
  it('trung bình tính cả số 0, bỏ ô trống và ô lỗi', () => {
    const d = ds([['0', '0'], ['1', ''], ['2', '4,5'], ['3', 'x']]);
    expect(columnMean(d, cols[1])).toEqual({ mean: 2.25, n: 2 });
    expect(columnMean(ds([['1', '']]), cols[1])).toBeNull();
  });
  it('validate chỉ báo lỗi ở cột số', () => {
    const errs = validateDatasets(cols, [ds([['1', 'abc'], ['x', '2']])]);
    expect(errs.map((e) => `${e.rowId}:${e.colId}`)).toEqual(['r0:b', 'r1:a']);
  });
  it('đồ thị bỏ qua ô trống thay vì vẽ ở 0, nhưng giữ điểm 0', () => {
    const [s] = buildSeries([ds([['0', '0'], ['5', ''], ['10', '3,5'], ['', '9']])], cols[0], cols[1]);
    expect(s.points).toEqual([{ x: 0, y: 0 }, { x: 10, y: 3.5 }]);
  });
  it('so sánh điều kiện đo giữa hai lượt', () => {
    const a = ds([], 'A', [{ k: 'Lượng nước', v: '200 mL' }, { k: 'Nhiệt độ phòng', v: '28' }]);
    const b = ds([], 'B', [{ k: 'lượng nước', v: '250 mL' }, { k: 'Nhiệt độ phòng', v: '28' }]);
    const d = conditionDiffs(a, b);
    expect(d.find((x) => x.key === 'Lượng nước')?.differs).toBe(true);
    expect(d.find((x) => x.key === 'Nhiệt độ phòng')?.differs).toBe(false);
  });
  it('thang đo nice', () => {
    const s = niceScale(0, 97); expect(s.lo).toBe(0); expect(s.hi).toBeGreaterThanOrEqual(97);
    const flat = niceScale(5, 5); expect(flat.lo).toBeLessThan(5); expect(flat.hi).toBeGreaterThan(5);
  });
});

describe('rubric', () => {
  it('rubric mặc định tổng 100 và hợp lệ', () => { expect(totalWeight(DEFAULT_RUBRIC)).toBe(100); expect(validateRubric(DEFAULT_RUBRIC)).toEqual([]); });
  it('hệ số 0 / 0,5 / 0,75 / 1', () => {
    expect([0, 1, 2, 3].map((l) => criterionScore(20, l))).toEqual([0, 10, 15, 20]);
  });
  it('tổng điểm công bố theo trọng số và mức', () => {
    const levels = [3, 2, 1, 2, 0, 3]; // 10 + 15 + 7.5 + 18.75 + 0 + 10
    const scores = Object.fromEntries(DEFAULT_RUBRIC.criteria.map((c, i) => [c.id, { level: levels[i], comment: '' }]));
    const r = computeResult(DEFAULT_RUBRIC, { scores, overallComment: 'ok' });
    expect(r.total).toBe(61.25);
    expect(r.rows.map((x) => x.score)).toEqual([10, 15, 7.5, 18.75, 0, 10]);
  });
  it('không công bố khi còn tiêu chí chưa chấm', () => {
    expect(() => computeResult(DEFAULT_RUBRIC, { scores: { c1: { level: 3, comment: '' } }, overallComment: '' })).toThrow();
  });
  it('chia lại trọng số cho nhiệm vụ ngắn về đúng 100', () => {
    const picked = DEFAULT_RUBRIC.criteria.filter((c) => c.stageKeys.some((k) => [5, 6].includes(k)));
    const r = rescaleWeights(picked);
    expect(r.reduce((a, c) => a + c.weight, 0)).toBe(100);
    expect(r.map((c) => c.weight)).toEqual([56, 44]);
  });
  it('validate: tổng sai và thiếu mô tả mức', () => {
    const bad = { criteria: [{ ...DEFAULT_RUBRIC.criteria[0], weight: 50 }] };
    expect(validateRubric(bad).join(' ')).toContain('cần đúng 100');
    expect(validateRubric({ criteria: [{ ...bad.criteria[0], weight: 100, levels: ['', 'b', 'c', 'd'] }] }).join(' ')).toContain('4 mức');
  });
});

describe('tiến độ chỉ tính trên chặng được giao', () => {
  const due = new Date(Date.now() - 86_400_000);
  it('nhiệm vụ ngắn 2 chặng', () => {
    const s = summarize([{ stageKey: 5, status: 'APPROVED', due }, { stageKey: 6, status: 'IN_PROGRESS', due }]);
    expect(s.assigned).toBe(2); expect(s.percentSubmitted).toBe(50); expect(s.overdue).toBe(1);
  });
  it('quá hạn không tính chặng đã nộp/duyệt', () => {
    const s = summarize([{ stageKey: 1, status: 'SUBMITTED', due }, { stageKey: 2, status: 'NEEDS_REVISION', due }]);
    expect(s.overdue).toBe(1); expect(s.waiting).toBe(1); expect(s.needsRevision).toBe(1);
  });
  it('nhóm chờ phản hồi xếp trước nhóm chưa nộp', () => {
    const a = summarize([{ stageKey: 1, status: 'SUBMITTED', due: null }]);
    const b = summarize([{ stageKey: 1, status: 'NOT_STARTED', due: null }]);
    expect(a.priority).toBeGreaterThan(b.priority);
  });
});

describe('validateStage', () => {
  it('chặn nộp khi trống', () => { expect(validateStage(2, 'STEM', { data: {}, evidence: [] }).blocking.length).toBe(1); });
  it('chặn nộp khi ô số sai', () => {
    const d = { data: { hypothesis: 'x', data: { columns: cols, datasets: [ds([['1', 'abc']])] } }, evidence: [] };
    expect(validateStage(5, 'STEM', d).blocking.join(' ')).toContain('ô nhập sai');
  });
  it('chặng thử nghiệm cần số liệu hoặc minh chứng', () => {
    const d = { data: { hypothesis: 'x', data: { columns: cols, datasets: [ds([['', '']])] } }, evidence: [] };
    expect(validateStage(5, 'STEM', d).blocking.join(' ')).toContain('số liệu');
    expect(validateStage(5, 'STEM', { ...d, evidence: [{ id: 'e', caption: '' }] }).blocking).toEqual([]);
  });
  it('số 0 là số liệu hợp lệ', () => {
    const d = { data: { data: { columns: cols, datasets: [ds([['0', '0']])] } }, evidence: [] };
    expect(validateStage(5, 'STEM', d).blocking).toEqual([]);
  });
  it('STEAM yêu cầu phần Arts', () => {
    const d = { data: { ideas: [{ title: 'a', desc: '' }, { title: 'b', desc: '' }], chosen: 'a' }, evidence: [] };
    expect(validateStage(3, 'STEAM', d).blocking.join(' ')).toContain('STEAM');
    expect(validateStage(3, 'STEM', d).blocking).toEqual([]);
  });
});

describe('tệp và danh sách học sinh', () => {
  it('nhận diện loại tệp bằng chữ kí, không tin phần mở rộng', () => {
    expect(sniffMime(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))?.mime).toBe('image/png');
    expect(sniffMime(Buffer.from('%PDF-1.7 ...'))?.mime).toBe('application/pdf');
    expect(sniffMime(Buffer.from('<html><script>alert(1)</script>'))).toBeNull();
    expect(sniffMime(Buffer.from('MZ\u0090\u0000'))).toBeNull();
  });
  it('tách dòng học sinh', () => {
    expect(parseStudentLines('HS01 | Nguyễn An\nTrần Bình\nhs02\n\n')).toEqual([
      { code: 'HS01', name: 'Nguyễn An' }, { code: null, name: 'Trần Bình' }, { code: 'HS02', name: 'HS02' },
    ]);
    expect(slugVi('Đỗ Tiến Dũng')).toBe('do.tien.dung');
  });
});
