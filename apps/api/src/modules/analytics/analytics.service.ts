import prisma from '../../config/prisma';
import type {
  AnalyticsOverview,
  TemplatePerformanceComparison,
  TemplatePerformanceSummary,
} from '@shared/types';
import { buildComparisonReasons, computeRates, roundPercent } from './metricsScoring';

type MetricAggregate = {
  templateId: string | null;
  sampleCount: number;
  plays: number;
  clicks: number;
  conversions: number;
  watchSum: number;
};

export class AnalyticsService {
  async getOverview(): Promise<AnalyticsOverview> {
    const metrics = await prisma.videoPerformanceMetric.findMany();
    const templatePerformance = await this.getTemplatePerformance();

    const totalPlays = metrics.reduce((sum, item) => sum + item.plays, 0);
    const totalClicks = metrics.reduce((sum, item) => sum + item.clicks, 0);
    const totalConversions = metrics.reduce((sum, item) => sum + item.conversions, 0);
    const watchSum = metrics.reduce((sum, item) => sum + item.averageWatchRate, 0);
    const averageWatchRate = metrics.length > 0 ? watchSum / metrics.length : 0;

    const rates = computeRates(totalPlays, totalClicks, totalConversions, averageWatchRate);

    const dailyTrend = this.buildDailyTrend(metrics);

    return {
      totalPlays,
      totalClicks,
      totalConversions,
      clickRate: rates.clickRate,
      conversionRate: rates.conversionRate,
      averageWatchRate: rates.averageWatchRate,
      dailyTrend,
      templatePerformance,
    };
  }

  async getTemplatePerformance(): Promise<TemplatePerformanceSummary[]> {
    const metrics = await prisma.videoPerformanceMetric.findMany();
    const templates = await prisma.inspirationTemplate.findMany();
    const templateNameById = new Map(templates.map((item) => [item.id, item.name]));

    const groups = new Map<string, MetricAggregate>();

    for (const metric of metrics) {
      const key = metric.templateId ?? '__unassigned__';
      const current = groups.get(key) ?? {
        templateId: metric.templateId,
        sampleCount: 0,
        plays: 0,
        clicks: 0,
        conversions: 0,
        watchSum: 0,
      };

      current.sampleCount += 1;
      current.plays += metric.plays;
      current.clicks += metric.clicks;
      current.conversions += metric.conversions;
      current.watchSum += metric.averageWatchRate;
      groups.set(key, current);
    }

    const summaries: TemplatePerformanceSummary[] = [];

    for (const [key, group] of groups.entries()) {
      const avgWatch = group.sampleCount > 0 ? group.watchSum / group.sampleCount : 0;
      const rates = computeRates(group.plays, group.clicks, group.conversions, avgWatch);
      const templateId = group.templateId ?? undefined;
      const templateName =
        templateId && templateNameById.get(templateId)
          ? templateNameById.get(templateId)!
          : key === '__unassigned__'
            ? '未关联模板'
            : templateId ?? '未知模板';

      summaries.push({
        templateId,
        templateName,
        sampleCount: group.sampleCount,
        plays: group.plays,
        clicks: group.clicks,
        conversions: group.conversions,
        clickRate: rates.clickRate,
        conversionRate: rates.conversionRate,
        averageWatchRate: rates.averageWatchRate,
        score: rates.score,
      });
    }

    return summaries.sort((a, b) => b.score - a.score);
  }

  async compareTemplates(
    leftTemplateId: string,
    rightTemplateId: string
  ): Promise<TemplatePerformanceComparison> {
    const summaries = await this.getTemplatePerformance();
    const left = await this.resolveTemplateSummary(leftTemplateId, summaries);
    const right = await this.resolveTemplateSummary(rightTemplateId, summaries);

    if (!left || !right) {
      throw new Error('TEMPLATE_NOT_FOUND');
    }

    let winnerTemplateId: string | undefined;
    if (left.score > right.score) {
      winnerTemplateId = leftTemplateId;
    } else if (right.score > left.score) {
      winnerTemplateId = rightTemplateId;
    }

    const reasons = buildComparisonReasons(
      left.templateName,
      right.templateName,
      left,
      right,
      winnerTemplateId,
      leftTemplateId
    );

    return { left, right, winnerTemplateId, reasons };
  }

  private buildDailyTrend(
    metrics: Array<{
      plays: number;
      clicks: number;
      conversions: number;
      collectedAt: Date;
    }>
  ): AnalyticsOverview['dailyTrend'] {
    const trend: AnalyticsOverview['dailyTrend'] = [];

    for (let i = 6; i >= 0; i -= 1) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayMetrics = metrics.filter(
        (item) => item.collectedAt.toISOString().split('T')[0] === dateStr
      );

      trend.push({
        date: dateStr,
        plays: dayMetrics.reduce((sum, item) => sum + item.plays, 0),
        clicks: dayMetrics.reduce((sum, item) => sum + item.clicks, 0),
        conversions: dayMetrics.reduce((sum, item) => sum + item.conversions, 0),
      });
    }

    return trend;
  }

  /** 供其他模块（如推荐 Agent）读取模板效果，不修改 template provider */
  async getTemplatePerformanceByTemplateId(
    templateId: string
  ): Promise<TemplatePerformanceSummary | null> {
    const summaries = await this.getTemplatePerformance();
    return summaries.find((item) => item.templateId === templateId) ?? null;
  }

  formatPerformanceReason(summary: TemplatePerformanceSummary): string {
    return `该模板在 ${summary.sampleCount} 条历史视频中平均转化率为 ${roundPercent(summary.conversionRate)}%`;
  }

  private async resolveTemplateSummary(
    templateId: string,
    summaries: TemplatePerformanceSummary[]
  ): Promise<TemplatePerformanceSummary | null> {
    const existing = summaries.find((item) => item.templateId === templateId);
    if (existing) {
      return existing;
    }

    const template = await prisma.inspirationTemplate.findUnique({ where: { id: templateId } });
    if (!template) {
      return null;
    }

    const rates = computeRates(0, 0, 0, 0);
    return {
      templateId,
      templateName: template.name,
      sampleCount: 0,
      plays: 0,
      clicks: 0,
      conversions: 0,
      clickRate: rates.clickRate,
      conversionRate: rates.conversionRate,
      averageWatchRate: rates.averageWatchRate,
      score: rates.score,
    };
  }
}
