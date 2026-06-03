import { randomUUID } from 'crypto';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import prisma from '../../config/prisma';
import { MaterialService } from '../materials/material.service';
import { createMaterialClipAnalysisProvider } from '../../providers/smart-edit/smartEditProviders';
import type { MaterialClip } from '@shared/types';
import {
  DEFAULT_IMAGE_CLIP_DURATION,
  MAX_VIDEO_CLIPS_PER_MATERIAL,
  VIDEO_SEGMENT_SECONDS,
  type MaterialClipDraft,
} from './materialClip.types';

const execAsync = promisify(exec);

type ClipRecord = {
  id: string;
  productId: string;
  materialId: string;
  sourceType: string;
  type: string;
  fileUrl: string;
  thumbnailUrl: string | null;
  startTime: number | null;
  endTime: number | null;
  duration: number;
  summary: string;
  tags: unknown;
  sceneType: string;
  visualQuality: number;
  motionLevel: string;
  suitableGoals: unknown;
  createdAt: Date;
};

function mapClip(record: ClipRecord): MaterialClip {
  return {
    id: record.id,
    productId: record.productId,
    materialId: record.materialId,
    sourceType: record.sourceType as MaterialClip['sourceType'],
    type: record.type as MaterialClip['type'],
    fileUrl: record.fileUrl,
    thumbnailUrl: record.thumbnailUrl ?? undefined,
    startTime: record.startTime ?? undefined,
    endTime: record.endTime ?? undefined,
    duration: record.duration,
    summary: record.summary,
    tags: Array.isArray(record.tags) ? (record.tags as string[]) : [],
    sceneType: record.sceneType as MaterialClip['sceneType'],
    visualQuality: record.visualQuality,
    motionLevel: record.motionLevel as MaterialClip['motionLevel'],
    suitableGoals: Array.isArray(record.suitableGoals)
      ? (record.suitableGoals as MaterialClip['suitableGoals'])
      : [],
    createdAt: record.createdAt.toISOString(),
  };
}

function resolveFfmpegPath(): string {
  if (process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) {
    return process.env.FFMPEG_PATH;
  }
  return 'ffmpeg';
}

function resolveLocalMediaPath(url: string): string | null {
  if (!url) return null;
  if (path.isAbsolute(url) && fs.existsSync(url)) return url;
  if (url.startsWith('/uploads/')) {
    const local = path.resolve(process.cwd(), url.slice(1));
    return fs.existsSync(local) ? local : null;
  }
  if (url.startsWith('uploads/')) {
    const local = path.resolve(process.cwd(), url);
    return fs.existsSync(local) ? local : null;
  }
  return null;
}

async function probeVideoDuration(fileUrl: string): Promise<number> {
  const local = resolveLocalMediaPath(fileUrl);
  if (!local) {
    return 10;
  }

  const ffmpegPath = resolveFfmpegPath();
  const ffprobePath = ffmpegPath.replace(/ffmpeg(\.exe)?$/i, 'ffprobe$1');
  try {
    const { stdout } = await execAsync(
      `"${ffprobePath}" -v error -show_entries format=duration -of csv=p=0 "${local}"`
    );
    const parsed = parseFloat(stdout.trim());
    if (!Number.isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  } catch {
    // fallback below
  }
  return 10;
}

export class MaterialClipService {
  private materialService = new MaterialService();

  async listByProductId(productId: string): Promise<MaterialClip[]> {
    const records = await prisma.materialClip.findMany({
      where: { productId },
      orderBy: [{ materialId: 'asc' }, { startTime: 'asc' }, { createdAt: 'asc' }],
    });
    return records.map((record: ClipRecord) => mapClip(record));
  }

  async analyze(productId: string, force = false): Promise<MaterialClip[]> {
    const existing = await prisma.materialClip.count({ where: { productId } });
    if (existing > 0 && !force) {
      return this.listByProductId(productId);
    }

    const materials = await this.materialService.listByProductId(productId);
    if (materials.length === 0) {
      throw new Error('NO_MATERIALS');
    }

    if (force || existing > 0) {
      await prisma.materialClip.deleteMany({ where: { productId } });
    }

    const analyzer = createMaterialClipAnalysisProvider();
    const drafts: MaterialClipDraft[] = [];

    for (const material of materials) {
      if (material.type === 'image') {
        drafts.push(
          await analyzer.analyzeSegment({
            material,
            productId,
            duration: DEFAULT_IMAGE_CLIP_DURATION,
          })
        );
        continue;
      }

      if (material.type === 'video') {
        const totalDuration = material.duration ?? (await probeVideoDuration(material.fileUrl));
        let start = 0;
        let segmentCount = 0;
        while (start < totalDuration && segmentCount < MAX_VIDEO_CLIPS_PER_MATERIAL) {
          const segmentDuration = Math.min(VIDEO_SEGMENT_SECONDS, totalDuration - start);
          if (segmentDuration <= 0.2) {
            break;
          }
          drafts.push(
            await analyzer.analyzeSegment({
              material,
              productId,
              startTime: start,
              endTime: start + segmentDuration,
              duration: segmentDuration,
            })
          );
          start += VIDEO_SEGMENT_SECONDS;
          segmentCount += 1;
        }
      }
    }

    if (drafts.length === 0) {
      throw new Error('NO_MATERIAL_CLIPS');
    }

    await prisma.materialClip.createMany({
      data: drafts.map((draft) => ({
        id: randomUUID(),
        productId: draft.productId,
        materialId: draft.materialId,
        sourceType: draft.sourceType,
        type: draft.type,
        fileUrl: draft.fileUrl,
        thumbnailUrl: draft.thumbnailUrl ?? null,
        startTime: draft.startTime ?? null,
        endTime: draft.endTime ?? null,
        duration: draft.duration,
        summary: draft.summary,
        tags: draft.tags,
        sceneType: draft.sceneType,
        visualQuality: draft.visualQuality,
        motionLevel: draft.motionLevel,
        suitableGoals: draft.suitableGoals,
      })),
    });

    return this.listByProductId(productId);
  }
}
