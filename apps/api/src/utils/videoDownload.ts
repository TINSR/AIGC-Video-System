import fs from 'fs';
import path from 'path';

const DEFAULT_TIMEOUT_MS = Number(process.env.VIDEO_DOWNLOAD_TIMEOUT_MS) || 60_000;
const MAX_BYTES = Number(process.env.VIDEO_DOWNLOAD_MAX_BYTES) || 200 * 1024 * 1024;

const ALLOWED_CONTENT_TYPES = new Set([
  'video/mp4',
  'application/octet-stream',
  'video/quicktime',
  'video/x-msvideo',
]);

export type VideoDownloadResult =
  | { ok: true; localUrl: string; bytes: number; contentType: string }
  | { ok: false; reason: string };

function isAllowedContentType(contentType: string | null): boolean {
  if (!contentType) return true;
  const base = contentType.split(';')[0].trim().toLowerCase();
  return ALLOWED_CONTENT_TYPES.has(base);
}

/**
 * Download remote Seedance video into local outputs directory with safety checks.
 */
export async function downloadVideoToOutputs(
  remoteUrl: string,
  taskId: string,
  outputDir = process.env.OUTPUT_DIR || './outputs'
): Promise<VideoDownloadResult> {
  if (!remoteUrl.startsWith('http://') && !remoteUrl.startsWith('https://')) {
    return { ok: false, reason: 'invalid remote url' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(remoteUrl, { signal: controller.signal });
    if (!response.ok) {
      return { ok: false, reason: `http ${response.status}` };
    }

    const contentType = response.headers.get('content-type');
    if (!isAllowedContentType(contentType)) {
      return { ok: false, reason: `unsupported content-type: ${contentType ?? 'unknown'}` };
    }

    const contentLength = response.headers.get('content-length');
    if (contentLength && Number(contentLength) > MAX_BYTES) {
      return { ok: false, reason: `file too large: ${contentLength} bytes` };
    }

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const filePath = path.join(outputDir, `${taskId}.mp4`);
    const body = response.body;
    if (!body) {
      return { ok: false, reason: 'empty response body' };
    }

    const reader = body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BYTES) {
        return { ok: false, reason: `download exceeds max size ${MAX_BYTES} bytes` };
      }
      chunks.push(value);
    }

    const buffer = Buffer.concat(chunks.map((c) => Buffer.from(c)));
    if (buffer.length === 0) {
      return { ok: false, reason: 'downloaded file is empty' };
    }

    fs.writeFileSync(filePath, buffer);
    if (!fs.existsSync(filePath)) {
      return { ok: false, reason: 'local file not written' };
    }

    return {
      ok: true,
      localUrl: `/outputs/${taskId}.mp4`,
      bytes: buffer.length,
      contentType: contentType?.split(';')[0].trim() ?? 'unknown',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('abort')) {
      return { ok: false, reason: `timeout after ${DEFAULT_TIMEOUT_MS}ms` };
    }
    return { ok: false, reason: message };
  } finally {
    clearTimeout(timeout);
  }
}
