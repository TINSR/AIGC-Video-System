import type {
  CommerceMetricsPlatform,
  CommerceMetricsSource,
  MetricsImportBatch,
  VideoPerformanceMetric,
} from '@shared/types';

export type VideoPerformanceMetricDraft = Omit<VideoPerformanceMetric, 'id' | 'createdAt'>;

export type MetricsImportRowError = MetricsImportBatch['errors'][number];

export type CommerceMetricsQuery = {
  source?: CommerceMetricsSource;
  platform?: CommerceMetricsPlatform;
  templateId?: string;
  days?: number;
  limit?: number;
};

export const COMMERCE_PLATFORMS: CommerceMetricsPlatform[] = ['mock', 'douyin_shop', 'tiktok_shop'];

export const CSV_HEADERS = [
  'videoId',
  'taskId',
  'creativePlanId',
  'templateId',
  'platform',
  'plays',
  'clicks',
  'conversions',
  'averageWatchRate',
  'collectedAt',
] as const;

export const MAX_CSV_ROWS = 500;
export const MAX_IMPORT_ERRORS = 100;
