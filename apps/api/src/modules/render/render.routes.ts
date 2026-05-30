import { Router } from 'express';
import { RenderController } from './render.controller';

const router = Router();
const controller = new RenderController();

router.post('/creative-plans/:id/render', controller.render);
router.get('/tasks', controller.list);
router.get('/tasks/:id', controller.getStatus);
router.post('/tasks/:id/retry', controller.retry);

export default router;
