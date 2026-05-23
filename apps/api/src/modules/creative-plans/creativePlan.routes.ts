import { Router } from 'express';
import { CreativePlanController } from './creativePlan.controller';
import { CreativePlanService } from './creativePlan.service';
import { planStore } from '../../memory-store';

const router = Router();
const controller = new CreativePlanController();
const creativePlanService = new CreativePlanService();

router.post('/products/:productId/creative-plans/generate', controller.generate);
router.get('/products/:productId/creative-plans', controller.list);
router.get('/creative-plans/:id', controller.get);
router.put('/creative-plans/:id', controller.update);
router.post('/creative-plans/:id/approve', controller.approve);
router.post('/creative-plans/:id/scenes/:sceneId/regenerate', controller.regenerateScene);

router.put('/creative-plans/:id/scenes/:sceneId', async (req, res) => {
  const { id, sceneId } = req.params;
  const plan = planStore.get(id);

  if (!plan) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: '创意方案不存在' },
    });
  }

  const sceneIndex = plan.scenes.findIndex(scene => scene.id === sceneId);
  if (sceneIndex < 0) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: '分镜不存在' },
    });
  }

  const updatedScene = {
    ...plan.scenes[sceneIndex],
    ...req.body,
    id: sceneId,
    creativePlanId: id,
    warnings: req.body.warnings ?? plan.scenes[sceneIndex].warnings,
  };

  const nextScenes = [...plan.scenes];
  nextScenes[sceneIndex] = updatedScene;
  const updatedPlan = await creativePlanService.updateCreativePlan(id, { scenes: nextScenes });

  if (!updatedPlan) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: '创意方案不存在' },
    });
  }

  return res.json({ success: true, data: updatedScene });
});

export default router;
