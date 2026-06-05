import { Request, Response } from 'express';
import type { ApiResponse, SmartEditPlan } from '@shared/types';
import { SmartEditService } from './smartEdit.service';

const service = new SmartEditService();

function mapError(error: unknown): { status: number; code: string; message: string } | null {
  if (!(error instanceof Error)) {
    return null;
  }
  switch (error.message) {
    case 'CREATIVE_PLAN_NOT_FOUND':
      return { status: 404, code: 'CREATIVE_PLAN_NOT_FOUND', message: '创意方案不存在' };
    case 'SMART_EDIT_PLAN_NOT_FOUND':
      return { status: 404, code: 'SMART_EDIT_PLAN_NOT_FOUND', message: '尚未生成智能剪辑计划' };
    case 'NO_MATERIAL_CLIPS':
      return { status: 400, code: 'NO_MATERIAL_CLIPS', message: '没有可用素材片段，请先分析素材' };
    case 'NO_MATERIALS':
      return { status: 400, code: 'NO_MATERIALS', message: '商品没有素材' };
    case 'SMART_EDIT_OVERRIDE_NOT_FOUND':
      return { status: 400, code: 'SMART_EDIT_OVERRIDE_NOT_FOUND', message: '要替换的分镜或素材片段不存在' };
    default:
      return null;
  }
}

export class SmartEditController {
  buildPlan = async (req: Request, res: Response<ApiResponse<SmartEditPlan>>) => {
    try {
      const force = req.body?.force === true;
      const overrides = Array.isArray(req.body?.overrides) ? req.body.overrides : [];
      const data = await service.buildPlan(req.params.id, force, overrides);
      res.json({ success: true, data });
    } catch (error) {
      const mapped = mapError(error);
      if (mapped) {
        return res.status(mapped.status).json({
          success: false,
          error: { code: mapped.code, message: mapped.message },
        });
      }
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : '生成智能剪辑计划失败',
        },
      });
    }
  };

  getPlan = async (req: Request, res: Response<ApiResponse<SmartEditPlan>>) => {
    try {
      const data = await service.getPlan(req.params.id);
      res.json({ success: true, data });
    } catch (error) {
      const mapped = mapError(error);
      if (mapped) {
        return res.status(mapped.status).json({
          success: false,
          error: { code: mapped.code, message: mapped.message },
        });
      }
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : '获取智能剪辑计划失败',
        },
      });
    }
  };
}
