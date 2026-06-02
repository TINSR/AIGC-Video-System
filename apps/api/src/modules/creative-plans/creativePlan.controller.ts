import { Request, Response } from 'express';
import { CreativePlanService } from './creativePlan.service';
import { RenderService } from '../render/render.service';
import { MaterialService } from '../materials/material.service';
import { ReferenceVideoService } from '../reference-videos/referenceVideo.service';
import { InspirationTemplateService } from '../inspiration-templates/inspirationTemplate.service';
import * as productService from '../products/product.service';
import { planStore } from '../../memory-store';
import type { ApiResponse, CreativePlan, Product, Material, Scene, GenerationTask } from '@shared/types';

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
  private renderService: RenderService;
  private materialService: MaterialService;
  private referenceVideoService: ReferenceVideoService;
  private inspirationTemplateService: InspirationTemplateService;

  constructor() {
    this.creativePlanService = new CreativePlanService();
    this.renderService = new RenderService();
    this.materialService = new MaterialService();
    this.referenceVideoService = new ReferenceVideoService();
    this.inspirationTemplateService = new InspirationTemplateService();
  }

  // 生成创意方案
  generate = async (req: Request, res: Response<ApiResponse<CreativePlan>>) => {
    try {
      const { productId } = req.params;
      const { style, maxDuration, referenceVideoId, templateId } = req.body;

      let product = productId === demoProduct.id ? demoProduct : { ...demoProduct, id: productId };
      try {
        const storedProduct = await productService.getProductById(productId);
        if (storedProduct) {
          product = {
            id: storedProduct.id,
            title: storedProduct.title,
            category: storedProduct.category,
            sellingPoints: storedProduct.sellingPoints,
            targetAudience: storedProduct.targetAudience,
            usageScene: storedProduct.usageScene,
            createdAt: storedProduct.createdAt.toISOString(),
          };
        }
      } catch (error) {
        console.warn('[CreativePlanController] product database read failed, using demo fallback:', error);
      }

      const storedMaterials = await this.materialService.listByProductId(productId);
      const materials = storedMaterials.length > 0 ? storedMaterials : productId === demoProduct.id ? demoMaterials : [];

      let referenceVideoAnalysis;
      if (typeof referenceVideoId === 'string' && referenceVideoId.trim()) {
        referenceVideoAnalysis = await this.referenceVideoService.getAnalysisForGenerate(referenceVideoId.trim());
        if (!referenceVideoAnalysis) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'REFERENCE_VIDEO_NOT_READY',
              message: '所选参考视频不存在或尚未分析成功，请先完成参考视频分析',
            },
          });
        }
      }

      let inspirationTemplate;
      if (typeof templateId === 'string' && templateId.trim()) {
        inspirationTemplate = await this.inspirationTemplateService.getGenerationContext(templateId.trim());
        if (!inspirationTemplate) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'TEMPLATE_NOT_FOUND',
              message: '所选模板不存在或不可用',
            },
          });
        }
      }

      const creativePlan = await this.creativePlanService.generateCreativePlan({
        product,
        materials,
        style,
        maxDuration,
        referenceVideoId: typeof referenceVideoId === 'string' ? referenceVideoId.trim() : undefined,
        referenceVideoAnalysis,
        templateId: typeof templateId === 'string' ? templateId.trim() : undefined,
        inspirationTemplate,
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
      const plans = await this.creativePlanService.listCreativePlans(productId);
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
          message: error instanceof Error ? error.message : '更新创意方案失败',
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

      const storedMaterials = await this.materialService.listByProductId(creativePlan.productId);
      const materials = storedMaterials.length > 0
        ? storedMaterials
        : creativePlan.productId === demoProduct.id ? demoMaterials : [];
      const scene = await this.creativePlanService.regenerateScene({
        creativePlan,
        sceneId,
        materials,
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

  batchUpdateScenes = async (req: Request, res: Response<ApiResponse<CreativePlan>>) => {
    try {
      const { id } = req.params;
      const { scenes } = req.body;

      if (!Array.isArray(scenes)) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_SCENES', message: 'scenes 必须是数组' },
        });
      }

      const plan = await this.creativePlanService.batchUpdateScenes(id, scenes);
      if (!plan) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: '创意方案不存在' },
        });
      }

      res.json({ success: true, data: plan });
    } catch (error) {
      const message = error instanceof Error ? error.message : '批量更新分镜失败';
      const status = message.includes('does not belong to plan') ? 400 : 400;
      res.status(status).json({
        success: false,
        error: {
          code: 'INVALID_SCENE_UPDATE',
          message,
        },
      });
    }
  };

  renderScene = async (req: Request, res: Response<ApiResponse<GenerationTask>>) => {
    try {
      const { id, sceneId } = req.params;
      const creativePlan = await this.creativePlanService.getCreativePlan(id);
      if (!creativePlan) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: '创意方案不存在' },
        });
      }

      const scene = creativePlan.scenes.find((s) => s.id === sceneId);
      if (!scene) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: '分镜不存在' },
        });
      }

      const materials = await this.materialService.listByProductId(creativePlan.productId);
      const task = await this.renderService.createSceneRenderTask(
        creativePlan,
        sceneId,
        materials.length > 0 ? materials : demoMaterials
      );

      res.json({ success: true, data: task });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : '分镜预览渲染失败',
        },
      });
    }
  };

  updateScene = async (req: Request, res: Response<ApiResponse<Scene>>) => {
    try {
      const { id, sceneId } = req.params;
      const scene = await this.creativePlanService.updateScene(id, sceneId, req.body);

      res.json({ success: true, data: scene });
    } catch (error) {
      const message = error instanceof Error ? error.message : '更新分镜失败';
      const isMissingScene = message.includes('does not belong to plan');
      const status = isMissingScene ? 404 : 400;
      res.status(status).json({
        success: false,
        error: {
          code: isMissingScene ? 'NOT_FOUND' : 'INVALID_SCENE_UPDATE',
          message,
        },
      });
    }
  };
}
