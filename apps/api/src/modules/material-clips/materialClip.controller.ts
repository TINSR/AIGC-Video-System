import { Request, Response } from 'express';
import type { ApiResponse, MaterialClip } from '@shared/types';
import { MaterialClipService } from './materialClip.service';

const service = new MaterialClipService();

export class MaterialClipController {
  analyze = async (req: Request, res: Response<ApiResponse<MaterialClip[]>>) => {
    try {
      const force = req.body?.force === true;
      const data = await service.analyze(req.params.productId, force);
      res.json({ success: true, data });
    } catch (error) {
      if (error instanceof Error && error.message === 'NO_MATERIALS') {
        return res.status(400).json({
          success: false,
          error: { code: 'NO_MATERIALS', message: '商品没有素材，请先上传图片或视频' },
        });
      }
      if (error instanceof Error && error.message === 'NO_MATERIAL_CLIPS') {
        return res.status(400).json({
          success: false,
          error: { code: 'NO_MATERIAL_CLIPS', message: '未能从素材生成可用片段' },
        });
      }
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : '素材片段分析失败',
        },
      });
    }
  };

  list = async (req: Request, res: Response<ApiResponse<MaterialClip[]>>) => {
    try {
      const data = await service.listByProductId(req.params.productId);
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : '获取素材片段失败',
        },
      });
    }
  };
}
