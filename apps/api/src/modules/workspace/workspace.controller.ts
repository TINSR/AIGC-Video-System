import { Request, Response } from 'express';
import { WorkspaceService } from './workspace.service';
import type { ApiResponse, WorkspaceTaskItem } from '@shared/types';

export class WorkspaceController {
  private workspaceService = new WorkspaceService();

  listTasks = async (_req: Request, res: Response<ApiResponse<WorkspaceTaskItem[]>>) => {
    try {
      const items = await this.workspaceService.listWorkspaceTasks();
      res.json({ success: true, data: items });
    } catch (error) {
      const message = error instanceof Error ? error.message : '工作台数据加载失败';
      console.error('[workspace] list failed:', error);
      res.status(503).json({
        success: false,
        error: {
          code: 'WORKSPACE_UNAVAILABLE',
          message: `工作台数据暂时不可用：${message}`,
        },
      });
    }
  };
}
