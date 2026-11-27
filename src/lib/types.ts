export type StageStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'NEEDS_REVISION' | 'APPROVED';
export type Mode = 'STEM' | 'STEAM';
export type Kind = 'FULL' | 'SHORT';

export const STATUS_LABEL: Record<StageStatus, string> = {
  NOT_STARTED: 'Chưa bắt đầu',
  IN_PROGRESS: 'Đang làm',
  SUBMITTED: 'Đã nộp',
  NEEDS_REVISION: 'Cần bổ sung',
  APPROVED: 'Đã duyệt',
};

export const STATUS_STYLE: Record<StageStatus, string> = {
  NOT_STARTED: 'bg-slate-100 text-slate-800 border-slate-300',
  IN_PROGRESS: 'bg-blue-50 text-blue-900 border-blue-300',
  SUBMITTED: 'bg-amber-50 text-amber-900 border-amber-400',
  NEEDS_REVISION: 'bg-rose-50 text-rose-900 border-rose-400',
  APPROVED: 'bg-emerald-50 text-emerald-900 border-emerald-400',
};

export const STATUS_ICON: Record<StageStatus, string> = {
  NOT_STARTED: '○', IN_PROGRESS: '◐', SUBMITTED: '⏳', NEEDS_REVISION: '↺', APPROVED: '✓',
};

export interface StageTemplateInfo {
  task: string;
  evidence: string[];
}

export interface ProjectContent {
  situation: string;
  productRequirements: string[];
  background: string[];
  materials: string[];
  criteria: { text: string; type: 'success' | 'constraint' }[];
  guidingQuestions: string[];
  stages: Record<string, StageTemplateInfo>;
  dataTable: {
    columns: { name: string; unit: string; type: 'number' | 'text' }[];
    datasetLabels: string[];
    conditionKeys: string[];
    defaultRows: number;
    note: string;
  };
  safety: string;
  toolNotes: string[];
  differentiation: { basic: string; advanced: string };
  steamFocus: string[];
  chartHint: { x: string; y: string };
}

export const MS_PER_DAY = 86_400_000;
