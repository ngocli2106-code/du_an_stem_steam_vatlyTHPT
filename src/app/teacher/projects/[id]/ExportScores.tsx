'use client';
import { useState } from 'react';
import type { CsvFormat } from '@/lib/csv';

export function ExportScores({ projectId }: { projectId: string }) {
  const [format, setFormat] = useState<CsvFormat>('vn');
  const [draft, setDraft] = useState(false);
  const href = `/api/projects/${projectId}/scores?format=${format}${draft ? '&draft=1' : ''}`;
  return (
    <div className="space-y-3">
      <fieldset><legend className="label">Định dạng</legend>
        <label className="mr-4 inline-flex min-h-[44px] items-center gap-2 text-sm"><input type="radio" name="csvfmt" checked={format === 'vn'} onChange={() => setFormat('vn')} /> Excel tiếng Việt (dấu ; và số thập phân 12,5)</label>
        <label className="inline-flex min-h-[44px] items-center gap-2 text-sm"><input type="radio" name="csvfmt" checked={format === 'std'} onChange={() => setFormat('std')} /> CSV chuẩn (dấu , và số 12.5, Google Sheets)</label>
      </fieldset>
      <label className="flex min-h-[44px] items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={draft} onChange={(e) => setDraft(e.target.checked)} />
        Gồm cả điểm nháp chưa công bố (chỉ để giáo viên đối chiếu, không gửi cho học sinh)</label>
      <a href={href} download className="btn-primary btn">Tải tệp CSV</a>
      <p className="hint">Mỗi học sinh một dòng; điểm là điểm sản phẩm của nhóm. Tự đánh giá cá nhân không nằm trong tệp.</p>
    </div>
  );
}
