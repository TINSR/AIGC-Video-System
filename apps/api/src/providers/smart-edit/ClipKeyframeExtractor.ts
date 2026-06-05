import { exec } from 'child_process';
import { randomUUID } from 'crypto';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import type { CandidateSegment, ClipKeyframes } from './types';
import {
  SMART_EDIT_TEMP_DIR,
  SMART_EDIT_KEYFRAME_LONG_EDGE,
  SMART_EDIT_KEYFRAME_QUALITY,
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

function getTempDir(): string {
  if (SMART_EDIT_TEMP_DIR && fs.existsSync(SMART_EDIT_TEMP_DIR)) {
    return SMART_EDIT_TEMP_DIR;
  }
  const dir = path.join(process.env.TEMP || './temp', 'smart-edit-keyframes');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

async function extractFrame(
  ffmpegPath: string,
  sourceFile: string,
  timestamp: number,
  outputPath: string,
): Promise<boolean> {
  const vf = `scale='min(${SMART_EDIT_KEYFRAME_LONG_EDGE},iw)':min'(${SMART_EDIT_KEYFRAME_LONG_EDGE},ih)':force_original_aspect_ratio=decrease`;
  const cmd = `"${ffmpegPath}" -ss ${timestamp.toFixed(3)} -i "${sourceFile}" -vframes 1 -q:v ${Math.round((100 - SMART_EDIT_KEYFRAME_QUALITY) * 31 / 100)} -vf "${vf}" -y "${outputPath}"`;

  try {
    await execAsync(cmd, { timeout: 10_000 });
    return fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0;
  } catch {
    return false;
  }
}

function pickFallbackFrame(successes: Array<{ index: number; path: string }>): string | undefined {
  if (successes.length === 0) return undefined;
  const mid = successes.find((s) => s.index === 1);
  if (mid) return mid.path;
  return successes[0].path;
}

export class ClipKeyframeExtractor {
  private ffmpegPath: string;
  private tempDir: string;

  constructor() {
    this.ffmpegPath = resolveFFmpegPath();
    this.tempDir = getTempDir();
  }

  async extract(segment: CandidateSegment): Promise<ClipKeyframes | null> {
    if (segment.detectionMethod === 'image') {
      return null;
    }

    if (!fs.existsSync(segment.sourceFile)) {
      return null;
    }

    const { startTime, endTime, duration } = segment;
    const timestamps = [
      startTime + duration * 0.15,
      startTime + duration * 0.50,
      startTime + duration * 0.85,
    ].map((t) => Math.max(startTime, Math.min(endTime, t)));

    const sessionId = randomUUID().slice(0, 8);
    const basePath = path.join(this.tempDir, `${sessionId}_${segment.materialId}`);

    const framePaths = timestamps.map((_, i) => `${basePath}_frame${i}.jpg`);

    const results = await Promise.all(
      timestamps.map((ts, i) =>
        extractFrame(this.ffmpegPath, segment.sourceFile, ts, framePaths[i])
          .then((ok) => ({ index: i, ok, path: framePaths[i] })),
      ),
    );

    const successes = results.filter((r) => r.ok);

    if (successes.length === 0) {
      return null;
    }

    if (successes.length === 3) {
      return {
        startFramePath: framePaths[0],
        middleFramePath: framePaths[1],
        endFramePath: framePaths[2],
      };
    }

    const fallback = pickFallbackFrame(successes)!;
    return {
      startFramePath: successes[0]?.path ?? fallback,
      middleFramePath: successes.find((s) => s.index === 1)?.path ?? fallback,
      endFramePath: successes[successes.length - 1]?.path ?? fallback,
    };
  }

  cleanup(frames: ClipKeyframes): void {
    const paths = [frames.startFramePath, frames.middleFramePath, frames.endFramePath];
    for (const p of paths) {
      try {
        if (fs.existsSync(p)) fs.unlinkSync(p);
      } catch {
        // best effort cleanup
      }
    }
  }

  cleanupAll(): void {
    try {
      if (fs.existsSync(this.tempDir)) {
        const files = fs.readdirSync(this.tempDir);
        for (const file of files) {
          if (file.endsWith('.jpg')) {
            fs.unlinkSync(path.join(this.tempDir, file));
          }
        }
      }
    } catch {
      // best effort cleanup
    }
  }
}
