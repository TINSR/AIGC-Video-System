import { z } from 'zod';
import type {
  ReferenceVideo,
  ReferenceVideoSourcePlatform,
  ReferenceVideoSourceType,
  ReferenceVideoAnalysisStatus,
  MaterialCloudStatus,
  ReferenceVideoAnalysis,
} from '@shared/types';

export const REFERENCE_VIDEO_PLATFORMS = [
  'douyin_shop',
  'tiktok_shop',
  'instagram',
  'facebook',
  'merchant_upload',
  'other',
] as const satisfies readonly ReferenceVideoSourcePlatform[];

export const REFERENCE_VIDEO_SOURCE_TYPES = [
  'merchant_owned',
  'licensed_public',
  'public_reference',
] as const satisfies readonly ReferenceVideoSourceType[];

export const createReferenceVideoSchema = z.object({
  title: z.string().min(1).max(200),
  sourcePlatform: z.enum(REFERENCE_VIDEO_PLATFORMS),
  sourceType: z.enum(REFERENCE_VIDEO_SOURCE_TYPES),
  sourceUrl: z.string().url().optional(),
  sourceNote: z.string().max(1000).optional(),
  category: z.string().min(1).max(100),
  keywords: z.array(z.string()).optional().default([]),
});

export const uploadReferenceVideoSchema = z.object({
  title: z.string().min(1).max(200),
  sourceType: z.enum(['merchant_owned', 'licensed_public', 'public_reference']).default('merchant_owned'),
  sourceNote: z.string().max(1000).optional(),
  category: z.string().min(1).max(100),
  keywords: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((value) => {
      if (!value) return [];
      const values = Array.isArray(value) ? value : value.split(',');
      return values.map((tag) => tag.trim()).filter(Boolean);
    }),
});

export type ReferenceVideoRecord = {
  id: string;
  title: string;
  sourcePlatform: string;
  sourceType: string;
  sourceUrl: string | null;
  sourceNote: string | null;
  category: string;
  keywords: unknown;
  fileUrl: string | null;
  publicUrl: string | null;
  cloudStatus: string | null;
  analysisStatus: string;
  analysis: unknown;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export function parseKeywords(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((item): item is string => typeof item === 'string');
  }
  return [];
}

export function mapReferenceVideo(record: ReferenceVideoRecord): ReferenceVideo {
  const analysis = record.analysis && typeof record.analysis === 'object'
    ? (record.analysis as ReferenceVideoAnalysis)
    : undefined;

  return {
    id: record.id,
    title: record.title,
    sourcePlatform: record.sourcePlatform as ReferenceVideoSourcePlatform,
    sourceType: record.sourceType as ReferenceVideoSourceType,
    sourceUrl: record.sourceUrl ?? undefined,
    sourceNote: record.sourceNote ?? undefined,
    category: record.category,
    keywords: parseKeywords(record.keywords),
    fileUrl: record.fileUrl ?? undefined,
    publicUrl: record.publicUrl ?? undefined,
    cloudStatus: (record.cloudStatus as MaterialCloudStatus) ?? undefined,
    analysisStatus: record.analysisStatus as ReferenceVideoAnalysisStatus,
    analysis,
    errorMessage: record.errorMessage ?? undefined,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export type ListReferenceVideosQuery = {
  sourcePlatform?: string;
  category?: string;
  keyword?: string;
  analysisStatus?: string;
};
