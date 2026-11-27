export const LEVEL_FACTORS = [0, 0.5, 0.75, 1] as const;
export const LEVEL_NAMES = ['Mức 1 – Chưa đạt', 'Mức 2 – Đạt một phần', 'Mức 3 – Đạt', 'Mức 4 – Tốt'] as const;

export interface RubricCriterion {
  id: string;
  name: string;
  weight: number;
  stageKeys: number[];
  levels: [string, string, string, string];
}
export interface Rubric { criteria: RubricCriterion[] }

export interface ScoreEntry { level: number | null; comment: string }
export interface GradeDraft { scores: Record<string, ScoreEntry>; overallComment: string }
export interface PublishedResult {
  rows: { id: string; name: string; weight: number; level: number; factor: number; score: number; comment: string; levelText?: string }[];
  total: number;
  /** Phiên bản rubric của dự án tại lúc công bố (không có ở kết quả cũ = phiên bản 1). */
  rubricVersion?: number;
  overallComment: string;
  publishedAt: string;
}

export const round2 = (n: number) => Math.round(n * 100) / 100;

export function criterionScore(weight: number, level: number): number {
  const f = LEVEL_FACTORS[level];
  if (f === undefined) throw new Error('Mức không hợp lệ');
  return round2(weight * f);
}

export function totalWeight(r: Rubric): number {
  return round2(r.criteria.reduce((a, c) => a + c.weight, 0));
}

export function validateRubric(r: Rubric): string[] {
  const errs: string[] = [];
  if (r.criteria.length === 0) errs.push('Cần ít nhất một tiêu chí.');
  const ids = new Set<string>();
  for (const c of r.criteria) {
    if (!c.name.trim()) errs.push('Có tiêu chí chưa đặt tên.');
    if (!Number.isFinite(c.weight) || c.weight < 0) errs.push(`Trọng số của “${c.name}” không hợp lệ.`);
    if (ids.has(c.id)) errs.push('Mã tiêu chí bị trùng.');
    ids.add(c.id);
    if (c.levels.some((l) => !l.trim())) errs.push(`“${c.name}” cần mô tả đủ 4 mức.`);
  }
  const t = totalWeight(r);
  if (t !== 100) errs.push(`Tổng trọng số hiện là ${t}, cần đúng 100.`);
  return errs;
}

/** Tính kết quả công bố từ bản nháp; ném lỗi nếu còn tiêu chí chưa chấm. */
export function computeResult(r: Rubric, d: GradeDraft, publishedAt = new Date().toISOString()): PublishedResult {
  const rows = r.criteria.map((c) => {
    const e = d.scores[c.id];
    if (!e || e.level === null || e.level === undefined) throw new Error(`Chưa chấm tiêu chí “${c.name}”.`);
    if (!Number.isInteger(e.level) || e.level < 0 || e.level > 3) throw new Error('Mức chấm không hợp lệ.');
    return {
      id: c.id, name: c.name, weight: c.weight, level: e.level,
      factor: LEVEL_FACTORS[e.level], score: criterionScore(c.weight, e.level), comment: e.comment ?? '', levelText: c.levels[e.level],
    };
  });
  return { rows, total: round2(rows.reduce((a, x) => a + x.score, 0)), overallComment: d.overallComment ?? '', publishedAt };
}

/** Chia lại trọng số cho các tiêu chí được chọn để tổng đúng 100 (dùng cho nhiệm vụ ngắn). */
export function rescaleWeights(criteria: RubricCriterion[]): RubricCriterion[] {
  const sum = criteria.reduce((a, c) => a + c.weight, 0);
  if (criteria.length === 0) return [];
  if (sum <= 0) {
    const each = Math.floor(100 / criteria.length);
    return criteria.map((c, i) => ({ ...c, weight: i === criteria.length - 1 ? 100 - each * (criteria.length - 1) : each }));
  }
  const scaled = criteria.map((c) => Math.round((c.weight / sum) * 100));
  const diff = 100 - scaled.reduce((a, b) => a + b, 0);
  let imax = 0;
  scaled.forEach((w, i) => { if (w > scaled[imax]) imax = i; });
  scaled[imax] += diff;
  return criteria.map((c, i) => ({ ...c, weight: scaled[i] }));
}

export const DEFAULT_RUBRIC: Rubric = {
  criteria: [
    {
      id: 'c1', name: 'Xác định vấn đề và tiêu chí', weight: 10, stageKeys: [1],
      levels: [
        'Chưa nêu rõ vấn đề hoặc đối tượng sử dụng; chưa có tiêu chí kiểm tra được.',
        'Nêu được vấn đề nhưng tiêu chí còn chung chung, khó đo hoặc không phân biệt với ràng buộc.',
        'Nêu rõ vấn đề, đối tượng và 2–4 tiêu chí kiểm tra được; có phân biệt tiêu chí với ràng buộc.',
        'Như mức 3, và mỗi tiêu chí có cách đo hoặc thang quan sát cụ thể, gắn với nhu cầu của người dùng.',
      ],
    },
    {
      id: 'c2', name: 'Vận dụng kiến thức Vật lí', weight: 20, stageKeys: [2],
      levels: [
        'Không nêu hoặc nêu sai nguyên lí Vật lí liên quan.',
        'Nêu nguyên lí nhưng đại lượng, đơn vị còn thiếu hoặc chưa gắn với thiết kế.',
        'Nêu đúng nguyên lí, đại lượng và đơn vị; giải thích được nguyên lí được dùng ở đâu trong thiết kế.',
        'Như mức 3, và dùng nguyên lí để dự đoán kết quả hoặc giải thích có lập luận định lượng/định tính chặt chẽ, có nguồn tham khảo.',
      ],
    },
    {
      id: 'c3', name: 'Thiết kế và giải thích lựa chọn', weight: 15, stageKeys: [3, 4],
      levels: [
        'Chỉ có một ý tưởng, không nêu lí do chọn.',
        'Có từ hai ý tưởng nhưng so sánh chưa theo tiêu chí hoặc lí do chọn chưa rõ.',
        'So sánh các ý tưởng theo tiêu chí và giải thích lí do chọn phương án; có bản phác thảo và kế hoạch chế tạo.',
        'Như mức 3, và quyết định thiết kế được lập luận bằng kiến thức Vật lí, ràng buộc thực tế; nhật kí chế tạo đầy đủ.',
      ],
    },
    {
      id: 'c4', name: 'Thu thập dữ liệu và phân tích thử nghiệm', weight: 25, stageKeys: [5],
      levels: [
        'Dữ liệu thiếu hoặc không rõ đơn vị, điều kiện; không xác định biến.',
        'Có dữ liệu nhưng ít lần đo, điều kiện đo chưa kiểm soát hoặc biến chưa rõ.',
        'Xác định đúng biến thay đổi/đo/giữ ổn định; dữ liệu nhiều lần đo có đơn vị và điều kiện; biểu diễn bằng đồ thị hoặc giá trị trung bình phù hợp.',
        'Như mức 3, và nhận xét được độ phân tán, nguồn sai số của phép đo và hạn chế của thiết bị đo.',
      ],
    },
    {
      id: 'c5', name: 'Cải tiến dựa trên minh chứng', weight: 20, stageKeys: [6],
      levels: [
        'Không có cải tiến hoặc cải tiến không dựa trên dữ liệu.',
        'Có cải tiến nhưng căn cứ số liệu mơ hồ; chưa xét điều kiện thử có so sánh được hay không.',
        'Nêu thay đổi, căn cứ bằng số liệu/quan sát, so sánh hai phiên bản và kết luận mức đạt tiêu chí.',
        'Như mức 3, và đánh giá được yếu tố ảnh hưởng phép đo, tính so sánh được của hai lượt thử, đề xuất bước tiếp theo hợp lí.',
      ],
    },
    {
      id: 'c6', name: 'Báo cáo và trình bày', weight: 10, stageKeys: [7],
      levels: [
        'Báo cáo thiếu nhiều phần hoặc khó theo dõi.',
        'Báo cáo có đủ phần chính nhưng thiếu liên kết giữa mục tiêu, dữ liệu và kết luận.',
        'Báo cáo đủ phần, mạch lạc; nêu kết quả và giới hạn; có phản tư cá nhân.',
        'Như mức 3, và trả lời tốt các câu hỏi bảo vệ, trình bày trực quan, trung thực về hạn chế.',
      ],
    },
  ],
};

export const USER_CENTERED_CRITERION: RubricCriterion = {
  id: 'c7', name: 'Thiết kế hướng tới người dùng', weight: 0, stageKeys: [1, 3, 6],
  levels: [
    'Không xét đến người dùng; quyết định về hình thức, công thái học hoặc truyền thông không có lí do.',
    'Có nhắc đến người dùng nhưng quyết định thiết kế chưa cụ thể hoặc chưa giải thích được.',
    'Có quyết định thiết kế cụ thể (hình thức/công thái học/truyền thông), giải thích lí do và có lấy phản hồi của người dùng.',
    'Như mức 3, và chỉ rõ phản hồi người dùng làm thay đổi bản thiết kế như thế nào, kèm minh chứng.',
  ],
};

/** Tiêu chí có trọng số > 0 nhưng không gắn với chặng nào được giao (dùng cho nhiệm vụ ngắn). */
export function criteriaOutsideStages(r: Rubric, stageKeys: number[]): RubricCriterion[] {
  return r.criteria.filter((c) => c.weight > 0 && c.stageKeys.length > 0 && !c.stageKeys.some((k) => stageKeys.includes(k)));
}

/** Bỏ điểm nháp của các tiêu chí không còn trong rubric. */
export function pruneDraft(d: GradeDraft, r: Rubric): GradeDraft {
  const ids = new Set(r.criteria.map((c) => c.id));
  return { ...d, scores: Object.fromEntries(Object.entries(d.scores).filter(([k]) => ids.has(k))) };
}

export function isPublishedStale(p: PublishedResult | null, currentVersion: number): boolean {
  return !!p && (p.rubricVersion ?? 1) !== currentVersion;
}
