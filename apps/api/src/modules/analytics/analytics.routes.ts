import { Router } from 'express';
import multer from 'multer';
import { AnalyticsController } from './analytics.controller';

const router = Router();
const controller = new AnalyticsController();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
});

router.get('/analytics/overview', controller.getOverview);
router.get('/analytics/template-performance', controller.getTemplatePerformance);
router.get('/analytics/template-performance/compare', controller.compareTemplatePerformance);
router.get('/analytics/metrics', controller.listMetrics);
router.get('/analytics/metrics/import-batches', controller.listImportBatches);
router.post('/analytics/metrics/mock-seed', controller.mockSeed);
router.post('/analytics/metrics/mock-reset', controller.mockReset);
router.post('/analytics/metrics/import-csv', upload.single('file'), controller.importCsv);

export default router;
