import { Request, Response } from 'express';
import { AnalyticsService } from './analytics.service';

const analyticsService = new AnalyticsService();

export class AnalyticsController {
  async getOverview(req: Request, res: Response) {
    const overview = await analyticsService.getOverview();
    res.json({ success: true, data: overview });
  }
}
