import { Request, Response } from 'express';
import { CreativePlanService } from './creativePlan.service';
import { planStore } from '../../memory-store';
import prisma from '../../config/prisma';
import type { ApiResponse, CreativePlan, Product, Material, Scene } from '@shared/types';

// Demo fixtures — 数据库未实现前的占位数据（仅 generate 使用）
const demoProduct: Product = {
  id: 'product_001',
  title: '便携榨汁杯',
  category: '厨房小家电',
  sellingPoints: ['便携', '易清洗', '适合健身和通勤'],
  targetAudience: '上班族、健身人群、学生',
  usageScene: '办公室、健身房、旅行途中',
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
  {
    id: 'material_002',
    productId: 'product_001',
    type: 'image',
    fileUrl: '/uploads/juicer_02.jpg',
    title: '榨汁杯产品图2',
    tags: ['榨汁杯', '使用场景'],
    createdAt: '2026-05-21T00:00:00.000Z',
  },
  {
    id: 'material_003',
    productId: 'product_001',
    type: 'video',
    fileUrl: '/uploads/juicer_demo.mp4',
    title: '榨汁杯演示视频',
    tags: ['榨汁杯', '演示'],
    duration: 15,
    createdAt: '2026-05-21T00:00:00.000Z',
  },
];

export class CreativePlanController {
  private creativePlanService: CreativePlanService;

  constructor() {
    this.creativePlanService = new CreativePlanService();
  }

  // 生成创意方案
  generate = async (req: Request, res: Response<ApiResponse<CreativePlan>>) => {
    try {
      const { productId } = req.params;
      const { style, maxDuration } = req.body;

      const product = productId === demoProduct.id ? demoProduct : { ...demoProduct, id: productId };

      const creativePlan = await this.creativePlanService.generateCreativePlan({
        product,
        materials: demoMaterials,
        style,
        maxDuration,
      });

      res.json({
        success: true,
        data: creativePlan,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : '生成创意方案失败',
        },
      });
    }
  };

  // 获取创意方案列表 — 从共享 planStore 按 productId 过滤
  list = async (req: Request, res: Response<ApiResponse<CreativePlan[]>>) => {
    try {
      const { productId } = req.params;
      const plans = Array.from(planStore.values())
        .filter(p => p.productId === productId);
      res.json({
        success: true,
        data: plans,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '获取创意方案列表失败',
        },
      });
    }
  };

  // 获取创意方案详情
  get = async (req: Request, res: Response<ApiResponse<CreativePlan>>) => {
    try {
      const { id } = req.params;
      const creativePlan = await this.creativePlanService.getCreativePlan(id);

      if (!creativePlan) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: '创意方案不存在',
          },
        });
      }

      res.json({
        success: true,
        data: creativePlan,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '获取创意方案详情失败',
        },
      });
    }
  };

  // 更新创意方案
  update = async (req: Request, res: Response<ApiResponse<CreativePlan>>) => {
    try {
      const { id } = req.params;
      const data = req.body;

      const creativePlan = await this.creativePlanService.updateCreativePlan(id, data);

      if (!creativePlan) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: '创意方案不存在',
          },
        });
      }

      res.json({
        success: true,
        data: creativePlan,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '更新创意方案失败',
        },
      });
    }
  };

  // 批准创意方案
  approve = async (req: Request, res: Response<ApiResponse<CreativePlan>>) => {
    try {
      const { id } = req.params;

      const creativePlan = await this.creativePlanService.approveCreativePlan(id);

      if (!creativePlan) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: '创意方案不存在',
          },
        });
      }

      res.json({
        success: true,
        data: creativePlan,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '批准创意方案失败',
        },
      });
    }
  };

  // 重新生成分镜 — 从共享 planStore 读取真实方案，并写回 store
  regenerateScene = async (req: Request, res: Response<ApiResponse<Scene>>) => {
    try {
      const { id, sceneId } = req.params;
      const { modifyRequest } = req.body;

      const creativePlan = planStore.get(id);
      if (!creativePlan) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: '创意方案不存在',
          },
        });
      }

      const scene = await this.creativePlanService.regenerateScene({
        creativePlan,
        sceneId,
        materials: demoMaterials,
        modifyRequest,
      });

      // 将重新生成的分镜写回 planStore
      const idx = creativePlan.scenes.findIndex(s => s.id === sceneId);
      if (idx >= 0) {
        creativePlan.scenes[idx] = scene;
      } else {
        creativePlan.scenes.push(scene);
      }
      planStore.set(id, creativePlan);

      res.json({
        success: true,
        data: scene,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : '重新生成分镜失败',
        },
      });
    }
  };

  // 批量更新分镜
  batchUpdateScenes = async (req: Request, res: Response<ApiResponse<CreativePlan>>) => {
    try {
      const { id } = req.params;
      const { scenes } = req.body;

      const plan = await this.creativePlanService.batchUpdateScenes(id, scenes);

      if (!plan) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Creative plan not found' }
        });
      }
      res.json({ success: true, data: plan });
    } catch (error: any) {
      if (error.message.includes('does not belong to plan')) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_SCENE', message: error.message }
        });
      }
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message }
      });
    }
  };

  // 更新单个分镜
  updateScene = async (req: Request, res: Response<ApiResponse<Scene>>) => {
    try {
      const { id, sceneId } = req.params;
      const data = req.body;

      const scene = await this.creativePlanService.updateScene(id, sceneId, data);

      res.json({ success: true, data: scene });
    } catch (error: any) {
      if (error.message.includes('does not belong to plan')) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: error.message }
        });
      }
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message }
      });
    }
  };

  // 渲染创意方案
  renderPlan = async (req: Request, res: Response<ApiResponse<any>>) => {
    try {
      const { id } = req.params;
      const plan = await this.creativePlanService.getCreativePlan(id);
      if (!plan) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Creative plan not found' }
        });
      }

      // 这里保留原有RenderService渲染逻辑，不修改现有链路
      const task = await prisma.generationTask.create({
        data: {
          productId: plan.productId,
          creativePlanId: plan.id,
          status: 'pending',
          provider: 'seedance_1_5',
          currentStep: '任务已创建'
        }
      });

      res.json({ success: true, data: task });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message }
      });
    }
  };
}
