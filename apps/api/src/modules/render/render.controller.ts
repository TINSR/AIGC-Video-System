import { Request, Response } from 'express';
import { RenderService } from './render.service';
import type { ApiResponse } from '@shared/types';
import type { GenerationTask } from '@shared/types';

export class RenderController {
  private renderService: RenderService;

  constructor() {
    this.renderService = new RenderService();
  }

  // 创建渲染任务
  render = async (req: Request, res: Response<ApiResponse<GenerationTask>>) => {
    try {
      const { id } = req.params;

      // TODO: 从数据库获取creativePlan和materials
      const creativePlan = { id, productId: 'prod_123' } as any;
      const materials = [] as any[];

      const task = await this.renderService.createRenderTask(creativePlan, materials);

      res.json({
        success: true,
        data: task,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : '创建渲染任务失败',
        },
      });
    }
  };

  // 获取任务状态
  getStatus = async (req: Request, res: Response<ApiResponse<GenerationTask>>) => {
    try {
      const { id } = req.params;

      const task = await this.renderService.getTaskStatus(id);

      if (!task) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: '任务不存在',
          },
        });
      }

      res.json({
        success: true,
        data: task,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '获取任务状态失败',
        },
      });
    }
  };

  // 重试失败任务
  retry = async (req: Request, res: Response<ApiResponse<GenerationTask>>) => {
    try {
      const { id } = req.params;

      const task = await this.renderService.retryTask(id);

      if (!task) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: '任务不存在',
          },
        });
      }

      res.json({
        success: true,
        data: task,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '重试任务失败',
        },
      });
    }
  };
}
