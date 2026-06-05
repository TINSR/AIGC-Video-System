import { randomUUID } from 'crypto';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import prisma from '../../config/prisma';
import { MaterialService } from '../materials/material.service';
import { createMaterialClipAnalysisProvider } from '../../providers/smart-edit/smartEditProviders';
import { SceneBoundaryDetector } from '../../providers/smart-edit/SceneBoundaryDetector';
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
  private boundaryDetector = new SceneBoundaryDetector();

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
        const localPath = resolveLocalMediaPath(material.fileUrl);
        const detected = localPath
          ? await this.boundaryDetector.detectSegments(material.id, localPath, false)
          : [];
        const segments = detected.length > 0
          ? detected
          : Array.from({ length: MAX_VIDEO_CLIPS_PER_MATERIAL }, (_, index) => {
              const startTime = index * VIDEO_SEGMENT_SECONDS;
              const duration = Math.min(VIDEO_SEGMENT_SECONDS, totalDuration - startTime);
              return {
                startTime,
                endTime: startTime + duration,
                duration,
              };
            }).filter((segment) => segment.duration > 0.2 && segment.startTime < totalDuration);

        for (const segment of segments) {
          drafts.push(
            await analyzer.analyzeSegment({
              material,
              productId,
              startTime: segment.startTime,
              endTime: segment.endTime,
              duration: segment.duration,
            })
          );
        }
      }
    }

    if (drafts.length === 0) {
      throw new Error('NO_MATERIAL_CLIPS');
    }

    const rows = drafts.map((draft) => ({
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
    }));

    await prisma.$transaction(async (tx) => {
      if (force || existing > 0) {
        const previous = await tx.materialClip.findMany({
          where: { productId },
          select: { id: true },
        });
        const previousIds = previous.map((clip) => clip.id);
        if (previousIds.length > 0) {
          await tx.sceneClipMatch.deleteMany({ where: { clipId: { in: previousIds } } });
        }
        await tx.materialClip.deleteMany({ where: { productId } });
      }
      await tx.materialClip.createMany({ data: rows });
    });

    return this.listByProductId(productId);
  }
}
