import { Request, Response } from 'express';
import * as productService from './product.service';
import { z } from 'zod';

const createProductSchema = z.object({
  title: z.string().min(1, '商品标题不能为空'),
  category: z.string().min(1, '商品分类不能为空'),
  sellingPoints: z.array(z.string()).min(1, '至少填写一个卖点'),
  targetAudience: z.string().min(1, '目标受众不能为空'),
  usageScene: z.string().min(1, '使用场景不能为空'),
});

export const createProduct = async (req: Request, res: Response) => {
  try {
    const validate = createProductSchema.safeParse(req.body);
    if (!validate.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: validate.error.errors[0].message,
        },
      });
    }

    const product = await productService.createProduct(validate.data);
    res.json({ success: true, data: product });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message },
    });
  }
};

export const getProducts = async (req: Request, res: Response) => {
  try {
    const products = await productService.getProducts();
    res.json({ success: true, data: products });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message },
    });
  }
};

export const getProductById = async (req: Request, res: Response) => {
  try {
    const product = await productService.getProductById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: '商品不存在' },
      });
    }
    res.json({ success: true, data: product });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message },
    });
  }
};

export const updateProduct = async (req: Request, res: Response) => {
  try {
    const validate = createProductSchema.partial().safeParse(req.body);
    if (!validate.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: validate.error.errors[0].message,
        },
      });
    }

    const product = await productService.updateProduct(req.params.id, validate.data);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: '商品不存在' },
      });
    }
    res.json({ success: true, data: product });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message },
    });
  }
};
