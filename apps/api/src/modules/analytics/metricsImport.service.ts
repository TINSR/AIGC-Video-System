import { randomUUID } from 'crypto';
import prisma from '../../config/prisma';
import type { MetricsImportBatch, VideoPerformanceMetric } from '@shared/types';
import { MockCommerceMetricsProvider } from '../../providers/metrics/MockCommerceMetricsProvider';
import { CsvCommerceMetricsProvider } from '../../providers/metrics/CsvCommerceMetricsProvider';
import { MAX_IMPORT_ERRORS, type CommerceMetricsQuery, type VideoPerformanceMetricDraft } from './metrics.types';

function mapMetric(record: {
  id: string;
  videoId: string;
  taskId: string | null;
  creativePlanId: string | null;
  templateId: string | null;
  platform: string;
  source: string;
  plays: number;
  clicks: number;
  conversions: number;
  averageWatchRate: number;
  collectedAt: Date;
  createdAt: Date;
}): VideoPerformanceMetric {
  return {
    id: record.id,
    videoId: record.videoId,
    taskId: record.taskId ?? undefined,
    creativePlanId: record.creativePlanId ?? undefined,
    templateId: record.templateId ?? undefined,
    platform: record.platform as VideoPerformanceMetric['platform'],
    source: record.source as VideoPerformanceMetric['source'],
    plays: record.plays,
    clicks: record.clicks,
    conversions: record.conversions,
    averageWatchRate: record.averageWatchRate,
    collectedAt: record.collectedAt.toISOString(),
    createdAt: record.createdAt.toISOString(),
  };
}

function mapBatch(record: {
  id: string;
  source: string;
  fileName: string | null;
  totalRows: number;
  acceptedRows: number;
  rejectedRows: number;
  errors: unknown;
  createdAt: Date;
}): MetricsImportBatch {
  return {
    id: record.id,
    source: record.source as MetricsImportBatch['source'],
    fileName: record.fileName ?? undefined,
    totalRows: record.totalRows,
    acceptedRows: record.acceptedRows,
    rejectedRows: record.rejectedRows,
    errors: Array.isArray(record.errors) ? (record.errors as MetricsImportBatch['errors']) : [],
    createdAt: record.createdAt.toISOString(),
  };
}

async function insertDrafts(drafts: VideoPerformanceMetricDraft[]): Promise<number> {
  if (drafts.length === 0) {
    return 0;
  }

  await prisma.videoPerformanceMetric.createMany({
    data: drafts.map((draft) => ({
      id: randomUUID(),
      videoId: draft.videoId,
      taskId: draft.taskId ?? null,
      creativePlanId: draft.creativePlanId ?? null,
      templateId: draft.templateId ?? null,
      platform: draft.platform,
      source: draft.source,
      plays: draft.plays,
      clicks: draft.clicks,
      conversions: draft.conversions,
      averageWatchRate: draft.averageWatchRate,
      collectedAt: new Date(draft.collectedAt),
    })),
  });

  return drafts.length;
}

export class MetricsImportService {
  async mockSeed(): Promise<{ seeded: boolean; count: number }> {
    const existing = await prisma.videoPerformanceMetric.count({
      where: { source: 'mock_seed' },
    });

    if (existing > 0) {
      return { seeded: false, count: existing };
    }

    const drafts = await new MockCommerceMetricsProvider().fetchMetrics();
    const count = await insertDrafts(drafts);
    return { seeded: true, count };
  }

  async mockReset(): Promise<{ deleted: number }> {
    const result = await prisma.videoPerformanceMetric.deleteMany({
      where: { source: 'mock_seed' },
    });
    return { deleted: result.count };
  }

  async importCsv(buffer: Buffer, fileName?: string): Promise<MetricsImportBatch> {
    const parser = new CsvCommerceMetricsProvider();
    const parsed = parser.parseCsvBuffer(buffer);
    const cappedErrors = parsed.errors.slice(0, MAX_IMPORT_ERRORS);

    const accepted = await insertDrafts(parsed.drafts);

    const batch = await prisma.metricsImportBatch.create({
      data: {
        id: randomUUID(),
        source: 'csv_import',
        fileName: fileName ?? null,
        totalRows: parsed.totalRows,
        acceptedRows: accepted,
        rejectedRows: parsed.errors.length,
        errors: cappedErrors,
      },
    });

    return mapBatch(batch);
  }

  async listMetrics(query: CommerceMetricsQuery): Promise<VideoPerformanceMetric[]> {
    const days = Number.isFinite(query.days) && query.days && query.days > 0 ? query.days : undefined;
    const since = days ? new Date(Date.now() - days * 24 * 60 * 60 * 1000) : undefined;
    const records = await prisma.videoPerformanceMetric.findMany({
      where: {
        ...(query.source ? { source: query.source } : {}),
        ...(query.platform ? { platform: query.platform } : {}),
        ...(query.templateId ? { templateId: query.templateId } : {}),
        ...(since ? { collectedAt: { gte: since } } : {}),
      },
      orderBy: { collectedAt: 'desc' },
      take: query.limit ?? 200,
    });
    return records.map(mapMetric);
  }

  async listImportBatches(): Promise<MetricsImportBatch[]> {
    const records = await prisma.metricsImportBatch.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return records.map(mapBatch);
  }
}
