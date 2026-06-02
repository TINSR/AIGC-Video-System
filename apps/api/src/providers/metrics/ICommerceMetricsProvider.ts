import type { CommerceMetricsSource, VideoPerformanceMetric } from '@shared/types';
import type { CommerceMetricsQuery, VideoPerformanceMetricDraft } from '../../modules/analytics/metrics.types';

export interface ICommerceMetricsProvider {
  fetchMetrics(input: CommerceMetricsQuery): Promise<VideoPerformanceMetricDraft[]>;
}

export type { VideoPerformanceMetric, VideoPerformanceMetricDraft, CommerceMetricsQuery };

export class PlatformNotConfiguredError extends Error {
  code = 'PLATFORM_NOT_CONFIGURED';

  constructor(platform: string) {
    super(`${platform} 未配置开放平台授权`);
    this.name = 'PlatformNotConfiguredError';
  }
}
