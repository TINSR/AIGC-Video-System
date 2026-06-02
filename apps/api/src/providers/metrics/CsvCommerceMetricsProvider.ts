import { parse } from 'csv-parse/sync';
import type { CommerceMetricsPlatform } from '@shared/types';
import type { ICommerceMetricsProvider } from './ICommerceMetricsProvider';
import {
  COMMERCE_PLATFORMS,
  CSV_HEADERS,
  MAX_CSV_ROWS,
  type MetricsImportRowError,
  type VideoPerformanceMetricDraft,
} from '../../modules/analytics/metrics.types';

export type CsvParseResult = {
  drafts: VideoPerformanceMetricDraft[];
  errors: MetricsImportRowError[];
  totalRows: number;
};

function normalizeHeader(value: string): string {
  return value.trim().replace(/^\uFEFF/, '');
}

function emptyToUndefined(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function validateRow(
  row: Record<string, string>,
  rowNumber: number
): { draft?: VideoPerformanceMetricDraft; error?: MetricsImportRowError } {
  const videoId = row.videoId?.trim();
  if (!videoId) {
    return { error: { row: rowNumber, message: 'videoId 不能为空' } };
  }

  const platform = row.platform?.trim() as CommerceMetricsPlatform;
  if (!COMMERCE_PLATFORMS.includes(platform)) {
    return { error: { row: rowNumber, message: 'platform 必须是 mock / douyin_shop / tiktok_shop' } };
  }

  const plays = Number(row.plays);
  const clicks = Number(row.clicks);
  const conversions = Number(row.conversions);
  const averageWatchRate = Number(row.averageWatchRate);

  if (!Number.isFinite(plays) || plays < 0) {
    return { error: { row: rowNumber, message: 'plays 必须是非负数字' } };
  }
  if (!Number.isFinite(clicks) || clicks < 0) {
    return { error: { row: rowNumber, message: 'clicks 必须是非负数字' } };
  }
  if (!Number.isFinite(conversions) || conversions < 0) {
    return { error: { row: rowNumber, message: 'conversions 必须是非负数字' } };
  }
  if (clicks > plays) {
    return { error: { row: rowNumber, message: 'clicks 不能大于 plays' } };
  }
  if (conversions > clicks) {
    return { error: { row: rowNumber, message: 'conversions 不能大于 clicks' } };
  }
  if (!Number.isFinite(averageWatchRate) || averageWatchRate < 0 || averageWatchRate > 100) {
    return { error: { row: rowNumber, message: 'averageWatchRate 必须在 0-100 之间' } };
  }

  const collectedRaw = row.collectedAt?.trim();
  if (!collectedRaw) {
    return { error: { row: rowNumber, message: 'collectedAt 不能为空' } };
  }
  const collectedAt = new Date(collectedRaw);
  if (Number.isNaN(collectedAt.getTime())) {
    return { error: { row: rowNumber, message: 'collectedAt 无法解析为日期' } };
  }

  return {
    draft: {
      videoId,
      taskId: emptyToUndefined(row.taskId),
      creativePlanId: emptyToUndefined(row.creativePlanId),
      templateId: emptyToUndefined(row.templateId),
      platform,
      source: 'csv_import',
      plays,
      clicks,
      conversions,
      averageWatchRate,
      collectedAt: collectedAt.toISOString(),
    },
  };
}

export class CsvCommerceMetricsProvider implements ICommerceMetricsProvider {
  async fetchMetrics(): Promise<VideoPerformanceMetricDraft[]> {
    throw new Error('CsvCommerceMetricsProvider 请使用 parseCsvBuffer');
  }

  parseCsvBuffer(buffer: Buffer): CsvParseResult {
    const content = buffer.toString('utf8').trim();
    if (!content) {
      throw new Error('CSV_EMPTY');
    }

    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: false,
    }) as Record<string, string>[];

    if (records.length === 0) {
      throw new Error('CSV_EMPTY');
    }

    const headers = Object.keys(records[0]).map(normalizeHeader);
    const expected = [...CSV_HEADERS];
    const headerValid =
      headers.length === expected.length && expected.every((name, index) => headers[index] === name);

    if (!headerValid) {
      throw new Error('CSV_INVALID_HEADER');
    }

    if (records.length > MAX_CSV_ROWS) {
      throw new Error('CSV_TOO_MANY_ROWS');
    }

    const drafts: VideoPerformanceMetricDraft[] = [];
    const errors: MetricsImportRowError[] = [];

    records.forEach((record, index) => {
      const rowNumber = index + 2;
      const normalized: Record<string, string> = {};
      for (const [key, value] of Object.entries(record)) {
        normalized[normalizeHeader(key)] = value;
      }
      const result = validateRow(normalized, rowNumber);
      if (result.error) {
        errors.push(result.error);
      } else if (result.draft) {
        drafts.push(result.draft);
      }
    });

    return {
      drafts,
      errors,
      totalRows: records.length,
    };
  }
}
