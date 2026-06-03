import { Request, Response } from 'express';
import type {
  AnalyticsOverview,
  ApiResponse,
  CommerceMetricsPlatform,
  CommerceMetricsSource,
  MetricsImportBatch,
  TemplatePerformanceComparison,
  TemplatePerformanceSummary,
  VideoPerformanceMetric,
} from '@shared/types';
import { AnalyticsService } from './analytics.service';
import { MetricsImportService } from './metricsImport.service';

const analyticsService = new AnalyticsService();
const metricsImportService = new MetricsImportService();

export class AnalyticsController {
  getOverview = async (_req: Request, res: Response<ApiResponse<AnalyticsOverview>>) => {
    try {
      const data = await analyticsService.getOverview();
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : '获取分析概览失败',
        },
      });
    }
  };

  getTemplatePerformance = async (
    _req: Request,
    res: Response<ApiResponse<TemplatePerformanceSummary[]>>
  ) => {
    try {
      const data = await analyticsService.getTemplatePerformance();
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : '获取模板效果失败',
        },
      });
    }
  };

  compareTemplatePerformance = async (req: Request, res: Response<ApiResponse<TemplatePerformanceComparison>>) => {
    const leftTemplateId = typeof req.query.leftTemplateId === 'string' ? req.query.leftTemplateId : '';
    const rightTemplateId = typeof req.query.rightTemplateId === 'string' ? req.query.rightTemplateId : '';

    if (!leftTemplateId || !rightTemplateId) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'leftTemplateId 与 rightTemplateId 必填' },
      });
    }

    try {
      const data = await analyticsService.compareTemplates(leftTemplateId, rightTemplateId);
      res.json({ success: true, data });
    } catch (error) {
      if (error instanceof Error && error.message === 'TEMPLATE_NOT_FOUND') {
        return res.status(404).json({
          success: false,
          error: { code: 'TEMPLATE_NOT_FOUND', message: '模板暂无效果数据或不存在' },
        });
      }
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : '模板对比失败',
        },
      });
    }
  };

  listMetrics = async (req: Request, res: Response<ApiResponse<VideoPerformanceMetric[]>>) => {
    try {
      const data = await metricsImportService.listMetrics({
        source: typeof req.query.source === 'string' ? (req.query.source as CommerceMetricsSource) : undefined,
        platform: typeof req.query.platform === 'string' ? (req.query.platform as CommerceMetricsPlatform) : undefined,
        templateId: typeof req.query.templateId === 'string' ? req.query.templateId : undefined,
        days: typeof req.query.days === 'string' ? Number(req.query.days) : undefined,
        limit: typeof req.query.limit === 'string' ? Number(req.query.limit) : undefined,
      });
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : '获取指标列表失败',
        },
      });
    }
  };

  listImportBatches = async (_req: Request, res: Response<ApiResponse<MetricsImportBatch[]>>) => {
    try {
      const data = await metricsImportService.listImportBatches();
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : '获取导入批次失败',
        },
      });
    }
  };

  mockSeed = async (_req: Request, res: Response) => {
    try {
      const data = await metricsImportService.mockSeed();
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Mock 指标初始化失败',
        },
      });
    }
  };

  mockReset = async (_req: Request, res: Response) => {
    try {
      const data = await metricsImportService.mockReset();
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Mock 指标重置失败',
        },
      });
    }
  };

  importCsv = async (req: Request, res: Response<ApiResponse<MetricsImportBatch>>) => {
    const file = req.file;
    if (!file) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '请上传 CSV 文件' },
      });
    }

    try {
      const data = await metricsImportService.importCsv(file.buffer, file.originalname);
      res.status(201).json({ success: true, data });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'CSV_INVALID_HEADER') {
          return res.status(400).json({
            success: false,
            error: { code: 'CSV_INVALID_HEADER', message: 'CSV 表头不正确' },
          });
        }
        if (error.message === 'CSV_TOO_MANY_ROWS') {
          return res.status(400).json({
            success: false,
            error: { code: 'CSV_TOO_MANY_ROWS', message: 'CSV 行数超过 500 行上限' },
          });
        }
        if (error.message === 'CSV_EMPTY') {
          return res.status(400).json({
            success: false,
            error: { code: 'CSV_EMPTY', message: 'CSV 文件为空' },
          });
        }
      }
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'CSV 导入失败',
        },
      });
    }
  };
}
