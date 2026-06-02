import { randomUUID } from 'crypto';
import prisma from '../../config/prisma';
import type { ICommerceMetricsProvider } from './ICommerceMetricsProvider';
import type { VideoPerformanceMetricDraft } from '../../modules/analytics/metrics.types';

export class MockCommerceMetricsProvider implements ICommerceMetricsProvider {
  async fetchMetrics(): Promise<VideoPerformanceMetricDraft[]> {
    const templates = await prisma.inspirationTemplate.findMany({
      where: { status: 'active' },
      take: 5,
      orderBy: { createdAt: 'asc' },
    });

    const templateIds =
      templates.length >= 3
        ? templates.slice(0, 3).map((item) => item.id)
        : [
            templates[0]?.id ?? 'mock-template-1',
            templates[1]?.id ?? 'mock-template-2',
            templates[2]?.id ?? 'mock-template-3',
          ];

    const drafts: VideoPerformanceMetricDraft[] = [];
    const now = new Date();

    for (let dayOffset = 0; dayOffset < 7; dayOffset += 1) {
      const collectedAt = new Date(now);
      collectedAt.setDate(now.getDate() - dayOffset);
      collectedAt.setHours(12, 0, 0, 0);

      for (let index = 0; index < 2 && drafts.length < 12; index += 1) {
        const templateId = templateIds[drafts.length % templateIds.length];
        const plays = 800 + drafts.length * 137;
        const clicks = Math.floor(plays * (0.12 + (drafts.length % 3) * 0.03));
        const conversions = Math.max(1, Math.floor(clicks * (0.06 + (drafts.length % 2) * 0.02)));

        drafts.push({
          videoId: `mock-video-${randomUUID().slice(0, 8)}`,
          taskId: `mock-task-${drafts.length + 1}`,
          creativePlanId: `mock-plan-${drafts.length + 1}`,
          templateId,
          platform: 'mock',
          source: 'mock_seed',
          plays,
          clicks,
          conversions,
          averageWatchRate: 45 + (drafts.length % 5) * 7,
          collectedAt: collectedAt.toISOString(),
        });
      }
    }

    return drafts.slice(0, 12);
  }
}
