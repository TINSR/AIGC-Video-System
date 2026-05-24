import { Request, Response } from 'express';
import { MaterialService } from './material.service';
import { z } from 'zod';

const materialService = new MaterialService();

const uploadSchema = z.object({
  title: z.string().min(1),
  tags: z.array(z.string()).optional().default([]),
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
