import type { Mode } from './types';

export const STAGES = [
  { key: 1, name: 'Xác định vấn đề', short: 'Vấn đề' },
  { key: 2, name: 'Tìm hiểu kiến thức nền', short: 'Kiến thức' },
  { key: 3, name: 'Đề xuất và chọn phương án', short: 'Phương án' },
  { key: 4, name: 'Chế tạo mẫu', short: 'Chế tạo' },
  { key: 5, name: 'Thử nghiệm', short: 'Thử nghiệm' },
  { key: 6, name: 'Phân tích và cải tiến', short: 'Cải tiến' },
  { key: 7, name: 'Báo cáo và phản tư', short: 'Báo cáo' },
] as const;

export const stageName = (k: number) => STAGES.find((s) => s.key === k)?.name ?? `Chặng ${k}`;
export const stageShort = (k: number) => STAGES.find((s) => s.key === k)?.short ?? `${k}`;

export type SubField = {
  key: string; label: string; kind: 'text' | 'longtext' | 'number' | 'select' | 'date'; options?: string[]; placeholder?: string;
};
export type Field =
  | { type: 'text' | 'longtext'; key: string; label: string; hint?: string; steamOnly?: boolean; placeholder?: string }
  | { type: 'select'; key: string; label: string; options: string[]; hint?: string }
  | { type: 'list'; key: string; label: string; hint?: string; addLabel: string; item: SubField[]; min?: number; max?: number; steamOnly?: boolean; sumKey?: string; sumLabel?: string }
  | { type: 'matrix'; key: string; label: string; hint?: string }
  | { type: 'datasets'; key: string; label: string; hint?: string; fixedLabels?: string[] }
  | { type: 'compare'; key: string; label: string };

export interface StageForm { prompts: string[]; fields: Field[] }

const sel = (...o: string[]) => o;

export const STAGE_FORMS: Record<number, StageForm> = {
  1: {
    prompts: ['Ai sẽ dùng sản phẩm, trong tình huống nào?', 'Điều gì khiến người dùng gặp khó khăn hiện nay?', 'Làm sao biết sản phẩm đã đạt yêu cầu?'],
    fields: [
      { type: 'longtext', key: 'situation', label: 'Mô tả tình huống và vấn đề', hint: 'Nêu bối cảnh, vấn đề cần giải quyết bằng lời của nhóm.' },
      { type: 'text', key: 'users', label: 'Đối tượng sử dụng' },
      { type: 'longtext', key: 'need', label: 'Nhu cầu của người dùng' },
      { type: 'list', key: 'criteria', label: 'Tiêu chí thành công và ràng buộc', hint: 'Tiêu chí thành công phải kiểm tra được (có số đo hoặc thang quan sát). Ràng buộc là giới hạn như chi phí, thời gian, kích thước, vật liệu. Nên có 2–4 tiêu chí thành công.', addLabel: 'Thêm tiêu chí / ràng buộc', min: 2, item: [
        { key: 'kind', label: 'Loại', kind: 'select', options: sel('Tiêu chí thành công', 'Ràng buộc') },
        { key: 'text', label: 'Nội dung', kind: 'text' },
        { key: 'check', label: 'Cách kiểm tra / giới hạn', kind: 'text' },
      ] },
      { type: 'longtext', key: 'userProfile', label: 'Hiểu người dùng (STEAM)', hint: 'Mô tả người dùng cụ thể: độ tuổi, thói quen, khó khăn khi thao tác hoặc đọc thông tin.', steamOnly: true },
    ],
  },
  2: {
    prompts: ['Nguyên lí Vật lí nào quyết định kết quả của sản phẩm?', 'Đại lượng nào đo được và đơn vị là gì?', 'Nguyên lí đó được vận dụng ở bộ phận nào của thiết kế?'],
    fields: [
      { type: 'longtext', key: 'principles', label: 'Nguyên lí Vật lí liên quan' },
      { type: 'list', key: 'quantities', label: 'Đại lượng và đơn vị', addLabel: 'Thêm đại lượng', min: 1, item: [
        { key: 'name', label: 'Đại lượng', kind: 'text' }, { key: 'symbol', label: 'Kí hiệu', kind: 'text' },
        { key: 'unit', label: 'Đơn vị', kind: 'text' }, { key: 'role', label: 'Vai trò trong dự án', kind: 'text' },
      ] },
      { type: 'longtext', key: 'application', label: 'Nguyên lí được vận dụng vào thiết kế như thế nào?' },
      { type: 'list', key: 'refs', label: 'Nguồn tham khảo', addLabel: 'Thêm nguồn', item: [
        { key: 'src', label: 'Nguồn (sách, trang web, bài giảng)', kind: 'text' }, { key: 'used', label: 'Đã dùng để làm gì', kind: 'text' },
      ] },
    ],
  },
  3: {
    prompts: ['Có ít nhất hai cách làm khác nhau nào?', 'Mỗi cách đáp ứng từng tiêu chí đến đâu?', 'Vì sao nhóm chọn cách này để chế tạo?'],
    fields: [
      { type: 'list', key: 'ideas', label: 'Các ý tưởng', hint: 'Đính kèm bản phác thảo ở phần Minh chứng.', addLabel: 'Thêm ý tưởng', min: 2, item: [
        { key: 'title', label: 'Tên ý tưởng', kind: 'text' }, { key: 'desc', label: 'Mô tả', kind: 'longtext' },
      ] },
      { type: 'matrix', key: 'matrix', label: 'Bảng so sánh theo tiêu chí', hint: 'Cho điểm 1–5 (5 là đáp ứng tốt nhất).' },
      { type: 'text', key: 'chosen', label: 'Phương án được chọn' },
      { type: 'longtext', key: 'reason', label: 'Lí do chọn phương án' },
      { type: 'list', key: 'artsDecisions', label: 'Quyết định thiết kế Arts (STEAM)', hint: 'Mỗi quyết định phải cụ thể, giải thích được và đánh giá được.', addLabel: 'Thêm quyết định', min: 1, steamOnly: true, item: [
        { key: 'aspect', label: 'Khía cạnh', kind: 'select', options: sel('Hình thức', 'Công thái học', 'Truyền thông') },
        { key: 'decision', label: 'Quyết định', kind: 'text' }, { key: 'why', label: 'Lí do và cách kiểm tra', kind: 'longtext' },
      ] },
    ],
  },
  4: {
    prompts: ['Cần những vật liệu và dụng cụ nào, chi phí bao nhiêu?', 'Ai làm phần việc nào?', 'Điều gì xảy ra khi chế tạo khác với bản thiết kế?'],
    fields: [
      { type: 'list', key: 'materials', label: 'Danh mục vật liệu', addLabel: 'Thêm vật liệu', min: 1, sumKey: 'cost', sumLabel: 'Tổng chi phí dự kiến (đồng)', item: [
        { key: 'name', label: 'Vật liệu / dụng cụ', kind: 'text' }, { key: 'qty', label: 'Số lượng', kind: 'text' }, { key: 'cost', label: 'Chi phí (đồng)', kind: 'number' },
      ] },
      { type: 'list', key: 'assignments', label: 'Phân công', addLabel: 'Thêm phân công', item: [
        { key: 'who', label: 'Thành viên', kind: 'text' }, { key: 'task', label: 'Nhiệm vụ', kind: 'text' },
      ] },
      { type: 'list', key: 'log', label: 'Nhật kí thực hiện', addLabel: 'Thêm mục nhật kí', min: 1, item: [
        { key: 'date', label: 'Ngày', kind: 'date' }, { key: 'what', label: 'Đã làm gì, gặp khó khăn gì', kind: 'longtext' },
      ] },
    ],
  },
  5: {
    prompts: ['Giả thuyết của nhóm là gì?', 'Biến nào thay đổi, biến nào đo, biến nào phải giữ ổn định?', 'Điều kiện đo của mỗi lượt có thật sự giống nhau không?'],
    fields: [
      { type: 'longtext', key: 'hypothesis', label: 'Giả thuyết' },
      { type: 'text', key: 'varChanged', label: 'Biến thay đổi' },
      { type: 'text', key: 'varMeasured', label: 'Biến đo' },
      { type: 'text', key: 'varControlled', label: 'Biến giữ ổn định' },
      { type: 'datasets', key: 'data', label: 'Dữ liệu đo' },
    ],
  },
  6: {
    prompts: ['Nhóm đã thay đổi điều gì và vì sao?', 'Số liệu hoặc quan sát nào cho thấy thay đổi có hiệu quả?', 'Yếu tố nào có thể làm phép đo sai lệch?'],
    fields: [
      { type: 'datasets', key: 'data', label: 'Dữ liệu hai phiên bản', fixedLabels: ['Phiên bản 1 (ban đầu)', 'Phiên bản 2 (cải tiến)'] },
      { type: 'compare', key: 'compare', label: 'So sánh hai phiên bản' },
      { type: 'longtext', key: 'changes', label: 'Những thay đổi đã thực hiện' },
      { type: 'longtext', key: 'basis', label: 'Số liệu hoặc quan sát làm căn cứ' },
      { type: 'longtext', key: 'factors', label: 'Yếu tố có thể ảnh hưởng phép đo' },
      { type: 'list', key: 'verdict', label: 'Mức độ đạt từng tiêu chí', addLabel: 'Thêm tiêu chí', min: 1, item: [
        { key: 'criterion', label: 'Tiêu chí', kind: 'text' },
        { key: 'level', label: 'Kết luận', kind: 'select', options: sel('Đạt', 'Đạt một phần', 'Chưa đạt') },
        { key: 'why', label: 'Căn cứ', kind: 'text' },
      ] },
      { type: 'list', key: 'userFeedback', label: 'Phản hồi của người dùng (STEAM)', hint: 'Cách lấy phản hồi, nội dung phản hồi và việc nhóm đã thay đổi bản thiết kế như thế nào.', addLabel: 'Thêm phản hồi', min: 1, steamOnly: true, item: [
        { key: 'how', label: 'Cách lấy phản hồi', kind: 'text' }, { key: 'said', label: 'Người dùng nói / làm gì', kind: 'longtext' }, { key: 'effect', label: 'Ảnh hưởng tới bản thiết kế', kind: 'longtext' },
      ] },
    ],
  },
  7: {
    prompts: ['Điều gì quan trọng nhất nhóm muốn người đọc hiểu?', 'Kết quả cuối cùng đạt tiêu chí nào, chưa đạt tiêu chí nào?', 'Nếu làm lại, nhóm sẽ thay đổi điều gì?'],
    fields: [
      { type: 'longtext', key: 'goal', label: 'Mục tiêu và nguyên lí Vật lí' },
      { type: 'longtext', key: 'design', label: 'Thiết kế và dữ liệu chính' },
      { type: 'longtext', key: 'improvement', label: 'Cải tiến và kết quả' },
      { type: 'longtext', key: 'limits', label: 'Giới hạn của dự án' },
      { type: 'list', key: 'defense', label: 'Câu hỏi chuẩn bị bảo vệ sản phẩm', addLabel: 'Thêm câu hỏi', min: 3, item: [
        { key: 'q', label: 'Câu hỏi', kind: 'text' }, { key: 'a', label: 'Câu trả lời dự kiến', kind: 'longtext' },
      ] },
    ],
  },
};

export const DEFENSE_QUESTIONS = [
  'Vì sao nhóm chọn phương án này mà không chọn phương án khác?',
  'Nguyên lí Vật lí nào giải thích kết quả đo của nhóm?',
  'Điều gì có thể làm kết quả của nhóm sai lệch, và nhóm đã hạn chế bằng cách nào?',
];

export const SELF_EVAL_ITEMS = [
  { key: 'tasks', label: 'Tôi hoàn thành phần việc được phân công' },
  { key: 'physics', label: 'Tôi giải thích được nguyên lí Vật lí của sản phẩm' },
  { key: 'data', label: 'Tôi hiểu cách đo và đọc dữ liệu của nhóm' },
  { key: 'team', label: 'Tôi lắng nghe và hợp tác với các bạn trong nhóm' },
];
export const SELF_EVAL_LEVELS = ['Chưa tốt', 'Tạm được', 'Tốt', 'Rất tốt'];

export interface DraftContent {
  data: Record<string, any>;
  evidence: { id: string; caption: string }[];
}

export function emptyDraft(): DraftContent {
  return { data: {}, evidence: [] };
}

export function parseDraft(json: string | null | undefined): DraftContent {
  try {
    const o = JSON.parse(json || '{}');
    return { data: o.data && typeof o.data === 'object' ? o.data : {}, evidence: Array.isArray(o.evidence) ? o.evidence : [] };
  } catch {
    return emptyDraft();
  }
}

export function fieldsFor(stageKey: number, mode: Mode): Field[] {
  const f = STAGE_FORMS[stageKey]?.fields ?? [];
  return f.filter((x) => !('steamOnly' in x && x.steamOnly) || mode === 'STEAM');
}
