import { Router } from 'express';
import * as creativePlanController from './creativePlan.controller';

const router = Router();

router.get('/:id', creativePlanController.getCreativePlan);
router.put('/:id/scenes', creativePlanController.batchUpdateScenes);
router.put('/:id/scenes/:sceneId', creativePlanController.updateScene);
router.post('/:id/scenes/:sceneId/regenerate', creativePlanController.regenerateScene);
router.post('/:id/approve', creativePlanController.approvePlan);
router.post('/:id/render', creativePlanController.renderPlan);

export default router;
