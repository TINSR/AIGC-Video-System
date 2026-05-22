import { Request, Response } from 'express';
import { CreativePlanService } from './creativePlan.service';
import type { ApiResponse, CreativePlan, Product, Material, Scene } from '@shared/types';

// Demo fixtures — 数据库未实现前的占位数据
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

      // 数据库未实现前使用 demo fixture；productId 用于路由匹配校验
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

  // 获取创意方案列表
  list = async (_req: Request, res: Response<ApiResponse<CreativePlan[]>>) => {
    try {
      // TODO: 实现列表查询逻辑
      res.json({
        success: true,
        data: [],
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

  // 重新生成分镜
  regenerateScene = async (req: Request, res: Response<ApiResponse<Scene>>) => {
    try {
      const { id, sceneId } = req.params;
      const { modifyRequest } = req.body;

      // 构建 demo creativePlan（数据库未实现前）
      const demoPlan: CreativePlan = {
        id,
        productId: demoProduct.id,
        status: 'draft',
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
            id: sceneId,
            creativePlanId: id,
            order: 1,
            duration: 3,
            visualDescription: '上班族匆忙出门，桌上水果来不及吃',
            subtitle: '早上来不及吃水果？',
            voiceover: '早上来不及吃水果？',
            materialId: 'material_001',
            seedancePrompt: '9:16 TikTok style commercial, bright morning kitchen',
            warnings: [],
            transition: 'zoom',
          },
        ],
        complianceWarnings: [],
        continuityWarnings: [],
        createdAt: '2026-05-21T00:00:00.000Z',
      };

      const scene = await this.creativePlanService.regenerateScene({
        creativePlan: demoPlan,
        sceneId,
        materials: demoMaterials,
        modifyRequest,
      });

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
}
