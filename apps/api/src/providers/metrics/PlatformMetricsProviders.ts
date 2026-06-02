import type { ICommerceMetricsProvider } from './ICommerceMetricsProvider';
import { PlatformNotConfiguredError } from './ICommerceMetricsProvider';

export class DouyinShopMetricsProvider implements ICommerceMetricsProvider {
  async fetchMetrics(): Promise<never> {
    throw new PlatformNotConfiguredError('douyin_shop');
  }
}

export class TikTokShopMetricsProvider implements ICommerceMetricsProvider {
  async fetchMetrics(): Promise<never> {
    throw new PlatformNotConfiguredError('tiktok_shop');
  }
}
