import { Router } from 'express';
import { AnalyticsController } from './analytics.controller';

const router = Router();
const controller = new AnalyticsController();

router.get('/analytics/overview', controller.getOverview);

export default router;
