import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import type { CandidateSegment } from './types';
import {
  SMART_EDIT_SCENE_THRESHOLD,
  SMART_EDIT_MIN_CLIP_DURATION,
  SMART_EDIT_TARGET_CLIP_DURATION,
  SMART_EDIT_MAX_CLIP_DURATION,
  SMART_EDIT_MAX_CLIPS_PER_MATERIAL,
  NOISE_BOUNDARY_THRESHOLD,
  FIXED_FALLBACK_DURATION,
  FIXED_FALLBACK_MIN_REMAINING,
} from './smartEditAlgorithmConfig';

const execAsync = promisify(exec);

function resolveFFmpegPath(): string {
  if (process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) {
    return process.env.FFMPEG_PATH;
  }
  if (process.platform === 'win32') {
    const candidates = [
      path.join(process.env.APPDATA || '', 'TRAE SOLO CN/ModularData/ai-agent/vm/tools/app/ffmpeg/ffmpeg.exe'),
      'C:/ffmpeg/bin/ffmpeg.exe',
      'C:/Program Files/ffmpeg/bin/ffmpeg.exe',
    ];
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) return candidate;
    }
  }
  return 'ffmpeg';
}

function getVideoDuration(ffmpegPath: string, filePath: string): Promise<number> {
  return new Promise((resolve) => {
    const cmd = `"${ffmpegPath}" -i "${filePath}" -f null - 2>&1`;
    exec(cmd, { timeout: 15_000 }, (error, stdout, stderr) => {
      const output = stdout + stderr;
      const match = output.match(/Duration:\s*(\d+):(\d+):(\d+)\.(\d+)/);
      if (match) {
        const h = parseInt(match[1], 10);
        const m = parseInt(match[2], 10);
        const s = parseInt(match[3], 10);
        const ms = parseInt(match[4].padEnd(3, '0').slice(0, 3), 10);
        resolve(h * 3600 + m * 60 + s + ms / 1000);
      } else {
        resolve(0);
      }
    });
  });
}

async function detectSceneChanges(
  ffmpegPath: string,
  filePath: string,
  threshold: number,
): Promise<number[]> {
  const safeThreshold = Math.max(0.20, Math.min(0.45, threshold));
  const cmd = `"${ffmpegPath}" -i "${filePath}" -vf "select='gt(scene,${safeThreshold})',showinfo" -f null - 2>&1`;

  try {
    const { stderr } = await execAsync(cmd, {
      timeout: 30_000,
      maxBuffer: 10 * 1024 * 1024,
    });

    const boundaries: number[] = [];
    const regex = /pts_time:\s*([\d.]+)/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(stderr)) !== null) {
      const t = parseFloat(match[1]);
      if (!isNaN(t) && t > 0) {
        boundaries.push(t);
      }
    }

    return boundaries.sort((a, b) => a - b);
  } catch {
    return [];
  }
}

function dedupBoundaries(boundaries: number[], totalDuration: number): number[] {
  const seen = new Set<number>();
  const result: number[] = [];

  for (const b of boundaries) {
    const rounded = Math.round(b * 100) / 100;
    if (rounded > 0 && rounded < totalDuration && !seen.has(rounded)) {
      seen.add(rounded);
      result.push(rounded);
    }
  }

  return result.sort((a, b) => a - b);
}

function removeNoiseBoundaries(boundaries: number[], totalDuration: number): number[] {
  if (boundaries.length === 0) return boundaries;

  const allPoints = [0, ...boundaries, totalDuration];
  const merged: number[] = [allPoints[0]];

  for (let i = 1; i < allPoints.length; i++) {
    const gap = allPoints[i] - merged[merged.length - 1];
    if (gap < NOISE_BOUNDARY_THRESHOLD) {
      continue;
    }
    merged.push(allPoints[i]);
  }

  return merged.slice(1, -1);
}

function buildSegmentsFromBoundaries(
  boundaries: number[],
  totalDuration: number,
  materialId: string,
  sourceFile: string,
): CandidateSegment[] {
  const allPoints = [0, ...boundaries, totalDuration];
  const rawSegments: CandidateSegment[] = [];

  for (let i = 0; i < allPoints.length - 1; i++) {
    const start = allPoints[i];
    const end = allPoints[i + 1];
    const duration = end - start;
    if (duration >= NOISE_BOUNDARY_THRESHOLD) {
      rawSegments.push({
        materialId,
        sourceFile,
        startTime: Math.round(start * 100) / 100,
        endTime: Math.round(end * 100) / 100,
        duration: Math.round(duration * 100) / 100,
        detectionMethod: 'scene_change',
      });
    }
  }

  return normalizeSegments(rawSegments);
}

function normalizeSegments(segments: CandidateSegment[]): CandidateSegment[] {
  let result: CandidateSegment[] = [];

  for (const seg of segments) {
    if (seg.duration < SMART_EDIT_MIN_CLIP_DURATION && result.length > 0) {
      const prev = result[result.length - 1];
      result[result.length - 1] = {
        ...prev,
        endTime: seg.endTime,
        duration: Math.round((seg.endTime - prev.startTime) * 100) / 100,
      };
    } else if (seg.duration > SMART_EDIT_MAX_CLIP_DURATION) {
      let start = seg.startTime;
      while (start < seg.endTime) {
        const end = Math.min(start + SMART_EDIT_TARGET_CLIP_DURATION, seg.endTime);
        const duration = end - start;
        if (duration >= NOISE_BOUNDARY_THRESHOLD) {
          result.push({
            ...seg,
            startTime: Math.round(start * 100) / 100,
            endTime: Math.round(end * 100) / 100,
            duration: Math.round(duration * 100) / 100,
          });
        }
        start = end;
      }
    } else {
      result.push(seg);
    }
  }

  return result.slice(0, SMART_EDIT_MAX_CLIPS_PER_MATERIAL);
}

function buildFixedFallbackSegments(
  totalDuration: number,
  materialId: string,
  sourceFile: string,
): CandidateSegment[] {
  const segments: CandidateSegment[] = [];
  let start = 0;
  let index = 0;

  while (start < totalDuration && index < SMART_EDIT_MAX_CLIPS_PER_MATERIAL) {
    let end = Math.min(start + FIXED_FALLBACK_DURATION, totalDuration);
    let duration = end - start;

    if (duration < FIXED_FALLBACK_MIN_REMAINING && segments.length > 0) {
      const prev = segments[segments.length - 1];
      segments[segments.length - 1] = {
        ...prev,
        endTime: end,
        duration: Math.round((end - prev.startTime) * 100) / 100,
      };
      break;
    }

    segments.push({
      materialId,
      sourceFile,
      startTime: Math.round(start * 100) / 100,
      endTime: Math.round(end * 100) / 100,
      duration: Math.round(duration * 100) / 100,
      detectionMethod: 'fixed_fallback',
    });

    start = end;
    index++;
  }

  return segments;
}

export class SceneBoundaryDetector {
  private ffmpegPath: string;

  constructor() {
    this.ffmpegPath = resolveFFmpegPath();
  }

  async detectSegments(
    materialId: string,
    sourceFile: string,
    isImage: boolean,
  ): Promise<CandidateSegment[]> {
    if (isImage) {
      return [{
        materialId,
        sourceFile,
        startTime: 0,
        endTime: FIXED_FALLBACK_DURATION,
        duration: FIXED_FALLBACK_DURATION,
        detectionMethod: 'image',
      }];
    }

    if (!fs.existsSync(sourceFile)) {
      return [];
    }

    try {
      const totalDuration = await getVideoDuration(this.ffmpegPath, sourceFile);
      if (totalDuration <= 0) {
        return [];
      }

      const rawBoundaries = await detectSceneChanges(
        this.ffmpegPath,
        sourceFile,
        SMART_EDIT_SCENE_THRESHOLD,
      );

      if (rawBoundaries.length === 0) {
        return buildFixedFallbackSegments(totalDuration, materialId, sourceFile);
      }

      const cleanBoundaries = removeNoiseBoundaries(
        dedupBoundaries(rawBoundaries, totalDuration),
        totalDuration,
      );

      const segments = buildSegmentsFromBoundaries(
        cleanBoundaries,
        totalDuration,
        materialId,
        sourceFile,
      );

      if (segments.length === 0) {
        return buildFixedFallbackSegments(totalDuration, materialId, sourceFile);
      }

      return segments;
    } catch (error) {
      console.warn('[SceneBoundaryDetector] Detection failed, using fixed fallback:', error instanceof Error ? error.message : error);
      return buildFixedFallbackSegments(
        FIXED_FALLBACK_DURATION * SMART_EDIT_MAX_CLIPS_PER_MATERIAL,
        materialId,
        sourceFile,
      );
    }
  }
}
