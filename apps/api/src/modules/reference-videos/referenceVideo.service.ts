import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import prisma from '../../config/prisma';
import { Prisma } from '@prisma/client';
import { uploadToObjectStorage, isObjectStorageConfigured } from '../../providers/storage/objectStorage';
import { ManualUrlReferenceVideoImportProvider } from '../../providers/reference-video/ManualUrlReferenceVideoImportProvider';
import { createReferenceVideoAnalysisProvider } from '../../providers/reference-video/DoubaoReferenceVideoAnalysisProvider';
import { truncateErrorMessage } from '../../providers/reference-video/referenceVideoAnalysisSchema';
import { isPublicHttpUrl } from '../../utils/publicUrlValidation';
import type { MaterialCloudStatus, ReferenceVideo, ReferenceVideoAnalysis } from '@shared/types';
import {
  mapReferenceVideo,
  type ListReferenceVideosQuery,
  type ReferenceVideoRecord,
} from './referenceVideo.types';

const VIDEO_EXT = new Set(['.mp4', '.mov', '.avi', '.webm']);
const MAX_VIDEO_BYTES = 200 * 1024 * 1024;

export const referenceVideoStore = new Map<string, ReferenceVideo>();

function resolveContentType(ext: string): string {
  const map: Record<string, string> = {
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.avi': 'video/x-msvideo',
    '.webm': 'video/webm',
  };
  return map[ext] || 'video/mp4';
}

export class ReferenceVideoService {
  private importProvider = new ManualUrlReferenceVideoImportProvider();
  private analysisProvider = createReferenceVideoAnalysisProvider();

  async createFromUrl(input: {
    title: string;
    sourcePlatform: ReferenceVideo['sourcePlatform'];
    sourceType: ReferenceVideo['sourceType'];
    sourceUrl?: string;
    sourceNote?: string;
    category: string;
    keywords: string[];
  }): Promise<ReferenceVideo> {
    if (!input.sourceUrl?.trim()) {
      throw new Error('sourceUrl 不能为空');
    }

    const imported = await this.importProvider.importByUrl({
      platform: input.sourcePlatform,
      sourceUrl: input.sourceUrl.trim(),
    });

    const id = randomUUID();
    const now = new Date();
    const record: ReferenceVideoRecord = {
      id,
      title: input.title,
      sourcePlatform: input.sourcePlatform,
      sourceType: input.sourceType,
      sourceUrl: imported.playableUrl ?? input.sourceUrl.trim(),
      sourceNote: input.sourceNote ?? null,
      category: input.category,
      keywords: input.keywords,
      fileUrl: null,
      publicUrl: imported.playableUrl ?? input.sourceUrl.trim(),
      cloudStatus: 'local_only',
      analysisStatus: 'pending',
      analysis: null,
      errorMessage: null,
      createdAt: now,
      updatedAt: now,
    };

    return this.persistRecord(record);
  }

  async uploadMerchantVideo(
    file: Express.Multer.File,
    input: {
      title: string;
      sourceType: ReferenceVideo['sourceType'];
      sourceNote?: string;
      category: string;
      keywords: string[];
    }
  ): Promise<ReferenceVideo> {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!VIDEO_EXT.has(ext)) {
      throw new Error('不支持的文件类型，仅支持 mp4/mov/avi/webm');
    }
    if (file.size > MAX_VIDEO_BYTES) {
      throw new Error('文件超过大小限制（200MB）');
    }

    const id = randomUUID();
    const fileName = `${id}${ext}`;
    const uploadDir = path.resolve(process.env.UPLOAD_DIR || './uploads', 'reference-videos');
    await fs.mkdir(uploadDir, { recursive: true });
    await fs.writeFile(path.join(uploadDir, fileName), file.buffer);

    let cloudStatus: MaterialCloudStatus = isObjectStorageConfigured() ? 'failed' : 'local_only';
    let publicUrl: string | undefined;

    if (isObjectStorageConfigured()) {
      const objectKey = `reference-videos/${fileName}`;
      const upload = await uploadToObjectStorage(objectKey, file.buffer, resolveContentType(ext));
      if (upload.ok) {
        cloudStatus = 'uploaded';
        publicUrl = upload.publicUrl;
        console.info(`[ReferenceVideoService] uploaded to object storage: ${objectKey}`);
      } else {
        console.warn(`[ReferenceVideoService] cloud upload failed: ${upload.reason}`);
        cloudStatus = 'failed';
      }
    }

    const now = new Date();
    const record: ReferenceVideoRecord = {
      id,
      title: input.title,
      sourcePlatform: 'merchant_upload',
      sourceType: input.sourceType,
      sourceUrl: publicUrl ?? null,
      sourceNote: input.sourceNote ?? null,
      category: input.category,
      keywords: input.keywords,
      fileUrl: `/uploads/reference-videos/${fileName}`,
      publicUrl: publicUrl ?? null,
      cloudStatus,
      analysisStatus: 'pending',
      analysis: null,
      errorMessage: null,
      createdAt: now,
      updatedAt: now,
    };

    return this.persistRecord(record);
  }

  async list(query: ListReferenceVideosQuery = {}): Promise<ReferenceVideo[]> {
    try {
      const records = await prisma.referenceVideo.findMany({ orderBy: { createdAt: 'desc' } });
      let items = records.map((record) => mapReferenceVideo(record as ReferenceVideoRecord));
      if (query.sourcePlatform) {
        items = items.filter((item) => item.sourcePlatform === query.sourcePlatform);
      }
      if (query.category) {
        items = items.filter((item) => item.category === query.category);
      }
      if (query.analysisStatus) {
        items = items.filter((item) => item.analysisStatus === query.analysisStatus);
      }
      if (query.keyword) {
        const kw = query.keyword.toLowerCase();
        items = items.filter((item) =>
          item.title.toLowerCase().includes(kw)
          || item.category.toLowerCase().includes(kw)
          || item.keywords.some((word) => word.toLowerCase().includes(kw))
        );
      }
      return items;
    } catch (error) {
      console.warn('[ReferenceVideoService] database list failed, using memory fallback:', error);
      let items = Array.from(referenceVideoStore.values());
      if (query.sourcePlatform) items = items.filter((item) => item.sourcePlatform === query.sourcePlatform);
      if (query.category) items = items.filter((item) => item.category === query.category);
      if (query.analysisStatus) items = items.filter((item) => item.analysisStatus === query.analysisStatus);
      if (query.keyword) {
        const kw = query.keyword.toLowerCase();
        items = items.filter((item) =>
          item.title.toLowerCase().includes(kw)
          || item.category.toLowerCase().includes(kw)
          || item.keywords.some((word) => word.toLowerCase().includes(kw))
        );
      }
      return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
  }

  async getById(id: string): Promise<ReferenceVideo | null> {
    try {
      const record = await prisma.referenceVideo.findUnique({ where: { id } });
      if (record) return mapReferenceVideo(record as ReferenceVideoRecord);
    } catch (error) {
      console.warn('[ReferenceVideoService] database read failed, using memory fallback:', error);
    }
    return referenceVideoStore.get(id) ?? null;
  }

  async analyze(id: string): Promise<ReferenceVideo> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error('参考视频不存在');
    }

    const playableUrl = this.resolvePlayableUrl(existing);
    if (!playableUrl) {
      return this.updateAnalysisState(id, {
        analysisStatus: 'failed',
        errorMessage: '无法分析：缺少公网可访问的视频 URL。商家上传请先配置 OSS 获取 publicUrl。',
      });
    }

    if (!isPublicHttpUrl(playableUrl)) {
      return this.updateAnalysisState(id, {
        analysisStatus: 'failed',
        errorMessage: '无法分析：视频 URL 不是有效的公网 http/https 地址',
      });
    }

    await this.updateAnalysisState(id, { analysisStatus: 'running', errorMessage: null });

    try {
      const analysis = await this.analysisProvider.analyze(playableUrl, {
        title: existing.title,
        category: existing.category,
      });
      return this.updateAnalysisState(id, {
        analysisStatus: 'success',
        analysis,
        errorMessage: null,
      });
    } catch (error) {
      const message = truncateErrorMessage(error instanceof Error ? error.message : String(error));
      return this.updateAnalysisState(id, {
        analysisStatus: 'failed',
        errorMessage: message,
      });
    }
  }

  async getAnalysisForGenerate(referenceVideoId: string): Promise<ReferenceVideoAnalysis | undefined> {
    const record = await this.getById(referenceVideoId);
    if (!record || record.analysisStatus !== 'success' || !record.analysis) {
      return undefined;
    }
    return record.analysis;
  }

  private resolvePlayableUrl(record: ReferenceVideo): string | undefined {
    const candidate = record.publicUrl?.trim() || record.sourceUrl?.trim();
    return candidate || undefined;
  }

  private async persistRecord(record: ReferenceVideoRecord): Promise<ReferenceVideo> {
    const mapped = mapReferenceVideo(record);
    try {
      await prisma.referenceVideo.create({
        data: {
          id: record.id,
          title: record.title,
          sourcePlatform: record.sourcePlatform,
          sourceType: record.sourceType,
          sourceUrl: record.sourceUrl,
          sourceNote: record.sourceNote,
          category: record.category,
          keywords: record.keywords ?? [],
          fileUrl: record.fileUrl,
          publicUrl: record.publicUrl,
          cloudStatus: record.cloudStatus,
          analysisStatus: record.analysisStatus,
          analysis: record.analysis ? (record.analysis as Prisma.InputJsonValue) : undefined,
          errorMessage: record.errorMessage,
        },
      });
    } catch (error) {
      console.warn('[ReferenceVideoService] database write failed, keeping memory fallback:', error);
    }
    referenceVideoStore.set(record.id, mapped);
    return mapped;
  }

  private async updateAnalysisState(
    id: string,
    patch: {
      analysisStatus: ReferenceVideo['analysisStatus'];
      analysis?: ReferenceVideoAnalysis | null;
      errorMessage?: string | null;
    }
  ): Promise<ReferenceVideo> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error('参考视频不存在');
    }

    const updated: ReferenceVideo = {
      ...existing,
      analysisStatus: patch.analysisStatus,
      analysis: patch.analysis === null ? undefined : patch.analysis ?? existing.analysis,
      errorMessage: patch.errorMessage === null ? undefined : patch.errorMessage ?? existing.errorMessage,
      updatedAt: new Date().toISOString(),
    };

    try {
      await prisma.referenceVideo.update({
        where: { id },
        data: {
          analysisStatus: patch.analysisStatus,
          analysis: patch.analysis === null
            ? Prisma.DbNull
            : (patch.analysis as Prisma.InputJsonValue | undefined) ?? undefined,
          errorMessage: patch.errorMessage ?? null,
        },
      });
    } catch (error) {
      console.warn('[ReferenceVideoService] database update failed, using memory fallback:', error);
    }

    referenceVideoStore.set(id, updated);
    return updated;
  }
}
