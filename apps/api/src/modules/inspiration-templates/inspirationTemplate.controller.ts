import { Request, Response } from 'express';
import type { ApiResponse, InspirationTemplate, InspirationTemplateRecommendation } from '@shared/types';
import { InspirationTemplateService } from './inspirationTemplate.service';
import {
  createTemplateSchema,
  generateTemplateSchema,
  updateTemplateSchema,
} from './inspirationTemplate.types';

export class InspirationTemplateController {
  private service = new InspirationTemplateService();

  list = async (req: Request, res: Response<ApiResponse<InspirationTemplate[]>>) => {
    const data = await this.service.list({
      category: typeof req.query.category === 'string' ? req.query.category : undefined,
      keyword: typeof req.query.keyword === 'string' ? req.query.keyword : undefined,
      sourceMode: typeof req.query.sourceMode === 'string' ? req.query.sourceMode : undefined,
      status: typeof req.query.status === 'string' ? req.query.status : undefined,
    });
    res.json({ success: true, data });
  };

  getById = async (req: Request, res: Response<ApiResponse<InspirationTemplate>>) => {
    const data = await this.service.getById(req.params.id);
    if (!data) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '模板不存在' } });
    }
    res.json({ success: true, data });
  };

  create = async (req: Request, res: Response<ApiResponse<InspirationTemplate>>) => {
    const parsed = createTemplateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.errors.map((e) => e.message).join('; ') },
      });
    }
    const data = await this.service.create({
      ...parsed.data,
      status: parsed.data.status ?? 'active',
    });
    res.status(201).json({ success: true, data });
  };

  update = async (req: Request, res: Response<ApiResponse<InspirationTemplate>>) => {
    const parsed = updateTemplateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.errors.map((e) => e.message).join('; ') },
      });
    }
    const data = await this.service.update(req.params.id, parsed.data);
    if (!data) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '模板不存在' } });
    }
    res.json({ success: true, data });
  };

  archive = async (req: Request, res: Response<ApiResponse<InspirationTemplate>>) => {
    const data = await this.service.archive(req.params.id);
    if (!data) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '模板不存在' } });
    }
    res.json({ success: true, data });
  };

  seedBuiltins = async (_req: Request, res: Response<ApiResponse<InspirationTemplate[]>>) => {
    const data = await this.service.seedBuiltins();
    res.json({ success: true, data });
  };

  generate = async (req: Request, res: Response<ApiResponse<InspirationTemplate[]>>) => {
    const parsed = generateTemplateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.errors.map((e) => e.message).join('; ') },
      });
    }
    try {
      const data = await this.service.generateByReferences(parsed.data);
      res.json({ success: true, data });
    } catch (error) {
      const message = error instanceof Error ? error.message : '模板归纳失败';
      if (message === 'NO_ANALYZED_REFERENCE_VIDEOS') {
        return res.status(400).json({
          success: false,
          error: { code: 'NO_ANALYZED_REFERENCE_VIDEOS', message: '没有可用于归纳的已分析参考视频' },
        });
      }
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message } });
    }
  };

  recommend = async (req: Request, res: Response<ApiResponse<InspirationTemplateRecommendation[]>>) => {
    try {
      const data = await this.service.recommendForProduct(req.params.productId);
      res.json({ success: true, data });
    } catch (error) {
      const message = error instanceof Error ? error.message : '模板推荐失败';
      if (message === 'PRODUCT_NOT_FOUND') {
        return res.status(404).json({
          success: false,
          error: { code: 'PRODUCT_NOT_FOUND', message: '商品不存在' },
        });
      }
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message } });
    }
  };
}
