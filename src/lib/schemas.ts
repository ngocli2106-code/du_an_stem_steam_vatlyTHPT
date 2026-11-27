import { z } from 'zod';

const str = (max = 2000) => z.string().max(max);

export const contentSchema = z.object({
  situation: str(4000),
  productRequirements: z.array(str(500)).max(20),
  background: z.array(str(500)).max(20),
  materials: z.array(str(200)).max(40),
  criteria: z.array(z.object({ text: str(500), type: z.enum(['success', 'constraint']) })).max(20),
  guidingQuestions: z.array(str(500)).max(10),
  stages: z.record(z.string(), z.object({ task: str(1500), evidence: z.array(str(300)).max(10) })),
  dataTable: z.object({
    columns: z.array(z.object({ name: str(80), unit: str(30), type: z.enum(['number', 'text']) })).min(1).max(12),
    datasetLabels: z.array(str(80)).min(1).max(6),
    conditionKeys: z.array(str(120)).max(12),
    defaultRows: z.number().int().min(1).max(30),
    note: str(1000),
  }),
  safety: str(2000),
  toolNotes: z.array(str(500)).max(20),
  differentiation: z.object({ basic: str(1500), advanced: str(1500) }),
  steamFocus: z.array(str(500)).max(10),
  chartHint: z.object({ x: str(80), y: str(80) }),
});

export const rubricSchema = z.object({
  criteria: z.array(z.object({
    id: z.string().min(1).max(20),
    name: str(120),
    weight: z.number().min(0).max(100),
    stageKeys: z.array(z.number().int().min(1).max(7)).max(7),
    levels: z.tuple([str(600), str(600), str(600), str(600)]),
  })).min(1).max(12),
});

export const templateBody = z.object({
  title: z.string().trim().min(1, 'Nhập tên mẫu').max(150),
  grade: z.number().int().min(10).max(12),
  mode: z.enum(['STEM', 'STEAM']),
  content: contentSchema,
  rubric: rubricSchema,
});

