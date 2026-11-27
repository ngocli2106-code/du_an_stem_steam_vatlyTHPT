import { fieldsFor, type DraftContent, type Field } from './stages';
import { hasAnyNumber, validateDatasets, type Column, type Dataset } from './dataset';
import type { Mode } from './types';

export function listItemFilled(item: Record<string, any>, ignoreKeys: string[] = ['kind', 'aspect', 'level']): boolean {
  return Object.entries(item ?? {}).some(([k, v]) => !ignoreKeys.includes(k) && typeof v === 'string' && v.trim() !== '');
}

export function fieldFilled(f: Field, data: Record<string, any>): boolean {
  const v = data[f.key];
  switch (f.type) {
    case 'text': case 'longtext': case 'select':
      return typeof v === 'string' && v.trim() !== '';
    case 'list':
      return Array.isArray(v) && v.some((it) => listItemFilled(it));
    case 'matrix':
      return false;
    case 'datasets':
      return !!v && Array.isArray(v.datasets) && hasAnyNumber(v.columns ?? [], v.datasets);
    case 'compare':
      return false;
  }
}

export function datasetErrorsOf(data: Record<string, any>) {
  const v = data?.data;
  if (!v || !Array.isArray(v.columns) || !Array.isArray(v.datasets)) return [];
  return validateDatasets(v.columns as Column[], v.datasets as Dataset[]);
}

export function validateStage(stageKey: number, mode: Mode, draft: DraftContent): { blocking: string[]; warnings: string[] } {
  const blocking: string[] = [];
  const warnings: string[] = [];
  const fields = fieldsFor(stageKey, mode);
  const anyField = fields.some((f) => fieldFilled(f, draft.data));
  if (!anyField && draft.evidence.length === 0) blocking.push('Chưa có nội dung hoặc minh chứng để nộp.');

  const errs = datasetErrorsOf(draft.data);
  if (errs.length) blocking.push(`Bảng dữ liệu còn ${errs.length} ô nhập sai. Hãy sửa các ô được đánh dấu đỏ trước khi nộp.`);

  if (stageKey === 5) {
    const d = draft.data.data;
    const hasNum = !!d && hasAnyNumber(d.columns ?? [], d.datasets ?? []);
    if (!hasNum && draft.evidence.length === 0) blocking.push('Chặng Thử nghiệm cần có số liệu đo (ít nhất một ô số) hoặc minh chứng đính kèm.');
    if (!draft.data.varChanged?.trim() || !draft.data.varMeasured?.trim() || !draft.data.varControlled?.trim()) {
      warnings.push('Chưa xác định đủ biến thay đổi, biến đo và biến giữ ổn định.');
    }
  }
  if (stageKey === 1) {
    const n = (draft.data.criteria ?? []).filter((c: any) => c.kind !== 'Ràng buộc' && c.text?.trim()).length;
    if (n < 2 || n > 4) warnings.push('Nên có 2–4 tiêu chí thành công kiểm tra được.');
  }
  if (mode === 'STEAM') {
    for (const f of fields) {
      if ('steamOnly' in f && f.steamOnly && !fieldFilled(f, draft.data)) {
        blocking.push(`Dự án STEAM yêu cầu hoàn thành mục “${f.label.replace(' (STEAM)', '')}”.`);
      }
    }
  }
  return { blocking, warnings };
}
