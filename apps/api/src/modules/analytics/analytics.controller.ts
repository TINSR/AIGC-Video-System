import { Request, Response } from 'express';
import { AnalyticsService } from './analytics.service';

const analyticsService = new AnalyticsService();

export class AnalyticsController {
  async getOverview(_req: Request, res: Response) {
    try {
      const overview = await analyticsService.getOverview();
      res.json({ success: true, data: overview });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : '获取分析概览失败',
        },
      });
    }
  }
}
