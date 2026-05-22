import { Request, Response } from 'express';
import { CreativePlanService } from './creativePlan.service';
import type { ApiResponse } from '@shared/types';
import type { CreativePlan } from '@shared/types';

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

      // TODO: 从数据库获取product和materials数据
      const product = { id: productId } as any;
      const materials = [] as any[];

      const creativePlan = await this.creativePlanService.generateCreativePlan({
        product,
        materials,
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
  list = async (req: Request, res: Response<ApiResponse<CreativePlan[]>>) => {
    try {
      const { productId } = req.params;
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
  regenerateScene = async (req: Request, res: Response<ApiResponse<any>>) => {
    try {
      const { id, sceneId } = req.params;
      const { modifyRequest } = req.body;

      // TODO: 获取creativePlan和materials
      const creativePlan = { id } as any;
      const materials = [] as any[];

      const scene = await this.creativePlanService.regenerateScene({
        creativePlan,
        sceneId,
        materials,
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
