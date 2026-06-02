import { Router } from 'express';
import { InspirationTemplateController } from './inspirationTemplate.controller';

const router = Router();
const controller = new InspirationTemplateController();

router.get('/inspiration-templates', controller.list);
router.get('/inspiration-templates/:id', controller.getById);
router.post('/inspiration-templates', controller.create);
router.put('/inspiration-templates/:id', controller.update);
router.post('/inspiration-templates/:id/archive', controller.archive);
router.post('/inspiration-templates/seed-builtins', controller.seedBuiltins);
router.post('/inspiration-templates/generate', controller.generate);
router.get('/products/:productId/inspiration-templates/recommendations', controller.recommend);

export default router;
