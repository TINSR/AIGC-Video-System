import { Request, Response } from 'express';
import { MaterialService } from './material.service';
import { z } from 'zod';

const materialService = new MaterialService();

const uploadSchema = z.object({
  title: z.string().min(1),
  tags: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform(value => {
      if (!value) return [];
      const values = Array.isArray(value) ? value : value.split(',');
      return values.map(tag => tag.trim()).filter(Boolean);
    }),
});

export class MaterialController {
  async list(req: Request, res: Response) {
    const { productId } = req.params;
    const materials = await materialService.listByProductId(productId);
    res.json({ success: true, data: materials });
  }

  async upload(req: Request, res: Response) {
    const { productId } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_REQUEST', message: '请上传文件' },
      });
    }

    const validateResult = uploadSchema.safeParse(req.body);
    if (!validateResult.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_REQUEST', message: '参数错误', details: validateResult.error.errors },
      });
    }

    const { title, tags } = validateResult.data;
    const material = await materialService.upload(productId, file, title, tags);

    res.status(201).json({ success: true, data: material });
  }

  async get(req: Request, res: Response) {
    const { id } = req.params;
    const material = await materialService.getById(id);

    if (!material) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: '素材不存在' },
      });
    }

    res.json({ success: true, data: material });
  }

  async update(req: Request, res: Response) {
    const { id } = req.params;
    const data = req.body;

    const material = await materialService.update(id, data);
    if (!material) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: '素材不存在' },
      });
    }

    res.json({ success: true, data: material });
  }

  async setPrimary(req: Request, res: Response) {
    const { productId, materialId } = req.params;

    try {
      const materials = await materialService.setPrimaryMaterial(productId, materialId);
      res.json({ success: true, data: materials });
    } catch (error) {
      const message = error instanceof Error ? error.message : '设置主图失败';
      const status = message.includes('不存在') || message.includes('不属于') ? 404 : 400;
      res.status(status).json({
        success: false,
        error: { code: status === 404 ? 'NOT_FOUND' : 'INVALID_REQUEST', message },
      });
    }
  }

  async delete(req: Request, res: Response) {
    const { id } = req.params;
    const success = await materialService.delete(id);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: '素材不存在' },
      });
    }

    res.json({ success: true });
  }
}
