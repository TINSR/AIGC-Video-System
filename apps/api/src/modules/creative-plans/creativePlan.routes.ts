import { Router } from 'express';
import { CreativePlanController } from './creativePlan.controller';
const router = Router();
const controller = new CreativePlanController();

router.post('/products/:productId/creative-plans/generate', controller.generate);
router.get('/products/:productId/creative-plans', controller.list);
router.get('/creative-plans/:id', controller.get);
router.put('/creative-plans/:id', controller.update);
router.post('/creative-plans/:id/approve', controller.approve);
router.post('/creative-plans/:id/scenes/:sceneId/regenerate', controller.regenerateScene);
router.put('/creative-plans/:id/scenes/:sceneId', controller.updateScene);
router.put('/creative-plans/:id/scenes', controller.batchUpdateScenes);

export default router;
