import { Request, Response } from 'express';
import { RenderService } from './render.service';
import { CreativePlanService } from '../creative-plans/creativePlan.service';
import { MaterialService } from '../materials/material.service';
import type { ApiResponse, GenerationTask, Material } from '@shared/types';

const demoMaterials: Material[] = [
  // Day 1: 素材为固定 demo fixture。
  // 生成 CreativePlan 时引用的 material_002/material_003 在 FFmpeg fallback
  // 会通过 resolveLocalMediaPath + generateSolidColorClip 兜底，不会报错。
  // 数据库实现后 materials 应随 plan 一起从 store 读取。
  {
    id: 'material_001',
    productId: 'product_001',
    type: 'image',
    fileUrl: '/uploads/juicer_01.jpg',
    title: '榨汁杯产品图1',
    tags: ['榨汁杯', '白色'],
    createdAt: '2026-05-21T00:00:00.000Z',
  },
];

export class RenderController {
  private renderService: RenderService;
  private creativePlanService: CreativePlanService;
  private materialService: MaterialService;

  constructor() {
    this.renderService = new RenderService();
    this.creativePlanService = new CreativePlanService();
    this.materialService = new MaterialService();
  }

  // 创建渲染任务 — 从共享 planStore 读取真实 CreativePlan
  render = async (req: Request, res: Response<ApiResponse<GenerationTask>>) => {
    try {
      const { id } = req.params;

      const creativePlan = await this.creativePlanService.getCreativePlan(id);
      if (!creativePlan) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: '创意方案不存在，请先生成或获取方案详情',
          },
        });
      }

      if (creativePlan.status !== 'approved') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_STATUS',
            message: `方案状态为 ${creativePlan.status}，需要先 approve 才能渲染`,
          },
        });
      }

      const primaryMaterialId = typeof req.body?.primaryMaterialId === 'string'
        ? req.body.primaryMaterialId
        : undefined;
      if (primaryMaterialId) {
        await this.materialService.setPrimaryMaterial(creativePlan.productId, primaryMaterialId);
      }

      const storedMaterials = await this.materialService.listByProductId(creativePlan.productId);
      const materials = storedMaterials.length > 0
        ? storedMaterials
        : creativePlan.productId === 'product_001' ? demoMaterials : [];
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
  list = async (_req: Request, res: Response<ApiResponse<GenerationTask[]>>) => {
    try {
      const tasks = await this.renderService.listTasks();
      res.json({
        success: true,
        data: tasks,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to list tasks',
        },
      });
    }
  };

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
          message: error instanceof Error ? error.message : '重试任务失败',
        },
      });
    }
  };
}
