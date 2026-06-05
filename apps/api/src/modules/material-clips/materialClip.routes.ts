import { Router } from 'express';
import { MaterialClipController } from './materialClip.controller';

const router = Router({ mergeParams: true });
const controller = new MaterialClipController();

router.post('/:productId/material-clips/analyze', controller.analyze);
router.get('/:productId/material-clips', controller.list);

export default router;
