import { Router } from 'express';
import { SmartEditController } from './smartEdit.controller';

const router = Router();
const controller = new SmartEditController();

router.post('/creative-plans/:id/smart-edit/plan', controller.buildPlan);
router.get('/creative-plans/:id/smart-edit/plan', controller.getPlan);

export default router;
