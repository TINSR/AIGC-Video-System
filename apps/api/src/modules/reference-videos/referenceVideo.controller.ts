import { Request, Response } from 'express';
import { ReferenceVideoService } from './referenceVideo.service';
import { createReferenceVideoSchema, uploadReferenceVideoSchema } from './referenceVideo.types';
import type { ApiResponse, ReferenceVideo } from '@shared/types';

export class ReferenceVideoController {
  private service = new ReferenceVideoService();

  create = async (req: Request, res: Response<ApiResponse<ReferenceVideo>>) => {
    try {
      const parsed = createReferenceVideoSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: parsed.error.errors.map((e) => e.message).join('; ') },
        });
      }

      const video = await this.service.createFromUrl(parsed.data);
      return res.status(201).json({ success: true, data: video });
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: error instanceof Error ? error.message : '创建参考视频失败',
        },
      });
    }
  };

  upload = async (req: Request, res: Response<ApiResponse<ReferenceVideo>>) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_REQUEST', message: '请上传视频文件' },
        });
      }

      const parsed = uploadReferenceVideoSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: parsed.error.errors.map((e) => e.message).join('; ') },
        });
      }

      const video = await this.service.uploadMerchantVideo(file, parsed.data);
      return res.status(201).json({ success: true, data: video });
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: error instanceof Error ? error.message : '上传参考视频失败',
        },
      });
    }
  };

  list = async (req: Request, res: Response<ApiResponse<ReferenceVideo[]>>) => {
    try {
      const videos = await this.service.list({
        sourcePlatform: typeof req.query.sourcePlatform === 'string' ? req.query.sourcePlatform : undefined,
        category: typeof req.query.category === 'string' ? req.query.category : undefined,
        keyword: typeof req.query.keyword === 'string' ? req.query.keyword : undefined,
        analysisStatus: typeof req.query.analysisStatus === 'string' ? req.query.analysisStatus : undefined,
      });
      return res.json({ success: true, data: videos });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : '获取参考视频列表失败',
        },
      });
    }
  };

  getById = async (req: Request, res: Response<ApiResponse<ReferenceVideo>>) => {
    try {
      const video = await this.service.getById(req.params.id);
      if (!video) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: '参考视频不存在' },
        });
      }
      return res.json({ success: true, data: video });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : '获取参考视频失败',
        },
      });
    }
  };

  analyze = async (req: Request, res: Response<ApiResponse<ReferenceVideo>>) => {
    try {
      const video = await this.service.analyze(req.params.id);
      return res.json({ success: true, data: video });
    } catch (error) {
      const message = error instanceof Error ? error.message : '分析失败';
      if (message.includes('不存在')) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message } });
      }
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message },
      });
    }
  };
}
