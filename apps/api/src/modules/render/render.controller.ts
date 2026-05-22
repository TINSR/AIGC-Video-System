import { Request, Response } from 'express';
import { RenderService } from './render.service';
import type { ApiResponse, GenerationTask, CreativePlan, Material } from '@shared/types';

// Demo fixture — 数据库未实现前的占位 creativePlan
const demoPlan: CreativePlan = {
  id: 'plan_001',
  productId: 'product_001',
  status: 'approved',
  style: 'pain_point',
  title: '早八也能喝到新鲜果汁',
  hook: '早上来不及吃水果？',
  adCopy: '30 秒打一杯新鲜果汁，通勤也能随身带走。',
  cta: '点击了解便携榨汁杯，让新鲜随身走。',
  visualBible: {
    aspectRatio: '9:16',
    style: 'TikTok 快节奏电商广告',
    colorTone: '明亮清爽',
    lighting: '柔和日光',
    cameraStyle: '手持近景 + 商品特写',
    productAppearance: '白色便携榨汁杯，透明杯身',
    mainScenes: ['早晨厨房', '办公室桌面'],
    continuityRules: ['每个分镜保持同一商品外观', '整体色调保持明亮清爽'],
  },
  scenes: [
    {
      id: 'scene_001',
      creativePlanId: 'plan_001',
      order: 1,
      duration: 3,
      visualDescription: '上班族匆忙出门，桌上水果来不及吃',
      subtitle: '早上来不及吃水果？',
      voiceover: '早上来不及吃水果？',
      materialId: 'material_001',
      seedancePrompt: '9:16 TikTok style commercial, bright morning kitchen, young office worker rushing out',
      warnings: [],
      transition: 'zoom',
    },
  ],
  complianceWarnings: [],
  continuityWarnings: [],
  createdAt: '2026-05-21T00:00:00.000Z',
};

const demoMaterials: Material[] = [
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

  constructor() {
    this.renderService = new RenderService();
  }

  // 创建渲染任务
  render = async (req: Request, res: Response<ApiResponse<GenerationTask>>) => {
    try {
      const { id } = req.params;

      // 数据库未实现前使用 demo fixture
      const creativePlan = id === demoPlan.id ? demoPlan : { ...demoPlan, id, productId: 'prod_default' };

      const task = await this.renderService.createRenderTask(creativePlan, demoMaterials);

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
