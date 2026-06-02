import { z } from 'zod';
import type {
  InspirationTemplate,
  InspirationTemplateSourceMode,
  InspirationTemplateStatus,
} from '@shared/types';

export const TEMPLATE_SOURCE_MODES = ['built_in', 'rule_generated', 'manual'] as const satisfies readonly InspirationTemplateSourceMode[];
export const TEMPLATE_STATUS = ['active', 'archived'] as const satisfies readonly InspirationTemplateStatus[];

export const createTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.string().max(100).optional(),
  description: z.string().min(1).max(2000),
  strategy: z.string().min(1).max(3000),
  hookType: z.string().min(1).max(100),
  style: z.string().min(1).max(100),
  factors: z.array(z.string()).default([]),
  constraints: z.array(z.string()).default([]),
  sceneGoals: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  referenceVideoIds: z.array(z.string()).default([]),
  sourceMode: z.enum(TEMPLATE_SOURCE_MODES).default('manual'),
  status: z.enum(TEMPLATE_STATUS).optional(),
});

export const updateTemplateSchema = createTemplateSchema.partial();

export const generateTemplateSchema = z.object({
  category: z.string().max(100).optional(),
  referenceVideoIds: z.array(z.string()).optional(),
});

export type InspirationTemplateRecord = {
  id: string;
  name: string;
  category: string | null;
  description: string;
  strategy: string;
  hookType: string;
  style: string;
  factors: unknown;
  constraints: unknown;
  sceneGoals: unknown;
  tags: unknown;
  referenceVideoIds: unknown;
  sourceMode: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

function toStringArray(raw: unknown): string[] {
  return Array.isArray(raw) ? raw.filter((item): item is string => typeof item === 'string') : [];
}

export function mapTemplate(record: InspirationTemplateRecord): InspirationTemplate {
  return {
    id: record.id,
    name: record.name,
    category: record.category ?? undefined,
    description: record.description,
    strategy: record.strategy,
    hookType: record.hookType,
    style: record.style,
    factors: toStringArray(record.factors),
    constraints: toStringArray(record.constraints),
    sceneGoals: toStringArray(record.sceneGoals),
    tags: toStringArray(record.tags),
    referenceVideoIds: toStringArray(record.referenceVideoIds),
    sourceMode: record.sourceMode as InspirationTemplateSourceMode,
    status: record.status as InspirationTemplateStatus,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export const BUILTIN_TEMPLATES: Array<
  Omit<InspirationTemplate, 'id' | 'createdAt' | 'updatedAt'>
> = [
  {
    name: '痛点转化型',
    category: undefined,
    description: '开场直击痛点，快速给出解决方案并引导购买。',
    strategy: '痛点问题开场 -> 解决方案展示 -> 强转化 CTA',
    hookType: 'pain_point_question',
    style: 'conversion',
    factors: ['痛点场景', '解决步骤', '购买收益'],
    constraints: ['避免夸大承诺', '保留真实场景'],
    sceneGoals: ['hook', 'feature', 'cta'],
    tags: ['痛点', '转化'],
    referenceVideoIds: [],
    sourceMode: 'built_in',
    status: 'active',
  },
  {
    name: '场景种草型',
    category: undefined,
    description: '通过生活方式场景植入，强调使用前后体验差异。',
    strategy: '生活场景代入 -> 产品自然融入 -> 轻 CTA',
    hookType: 'scenario',
    style: 'lifestyle',
    factors: ['真实场景', '人物代入', '情绪氛围'],
    constraints: ['避免硬广语气'],
    sceneGoals: ['hook', 'feature', 'proof', 'cta'],
    tags: ['场景', '种草'],
    referenceVideoIds: [],
    sourceMode: 'built_in',
    status: 'active',
  },
  {
    name: '测评对比型',
    category: undefined,
    description: '通过对比和实测信息增强说服力。',
    strategy: '问题提出 -> 对比测试 -> 结论推荐',
    hookType: 'review_comparison',
    style: 'review',
    factors: ['测试维度', '客观对比', '结论摘要'],
    constraints: ['避免贬低竞品'],
    sceneGoals: ['hook', 'proof', 'feature', 'cta'],
    tags: ['测评', '对比'],
    referenceVideoIds: [],
    sourceMode: 'built_in',
    status: 'active',
  },
  {
    name: '促销转化型',
    category: undefined,
    description: '强调优惠窗口和行动召回，提高即时下单率。',
    strategy: '福利信息开场 -> 卖点强化 -> 限时 CTA',
    hookType: 'discount_offer',
    style: 'promotion',
    factors: ['优惠信息', '下单理由', '紧迫感'],
    constraints: ['避免虚假优惠'],
    sceneGoals: ['hook', 'feature', 'cta'],
    tags: ['促销', '优惠'],
    referenceVideoIds: [],
    sourceMode: 'built_in',
    status: 'active',
  },
  {
    name: '质感展示型',
    category: undefined,
    description: '突出视觉质感和产品细节，适合高客单价商品。',
    strategy: '质感镜头开场 -> 核心细节展示 -> 品牌化 CTA',
    hookType: 'premium_texture',
    style: 'premium',
    factors: ['材质细节', '光影氛围', '品牌感'],
    constraints: ['保持视觉一致性'],
    sceneGoals: ['hook', 'feature', 'proof', 'cta'],
    tags: ['质感', '高级'],
    referenceVideoIds: [],
    sourceMode: 'built_in',
    status: 'active',
  },
];
