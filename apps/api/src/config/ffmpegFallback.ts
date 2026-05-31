/** Default true — demo mode allows FFmpeg when Seedance is unavailable. */
export function isFfmpegFallbackAllowed(): boolean {
  const value = (process.env.ALLOW_FFMPEG_FALLBACK ?? 'true').trim().toLowerCase();
  return value === 'true' || value === '1' || value === 'yes';
}

export const FFMPEG_FALLBACK_DISABLED_MESSAGE =
  'Seedance 不可用，且生产模式已关闭 FFmpeg 兜底（ALLOW_FFMPEG_FALLBACK=false）。请配置 Seedance API Key 或开启演示兜底。';
