import { Router } from 'express';
import { WorkspaceController } from './workspace.controller';

const router = Router();
const controller = new WorkspaceController();

router.get('/workspace/tasks', controller.listTasks);

export default router;
