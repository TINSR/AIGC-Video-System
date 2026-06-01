import type { IReferenceVideoImportProvider } from './IReferenceVideoImportProvider';

function notImplemented(platform: string): IReferenceVideoImportProvider {
  return {
    async importByUrl() {
      throw new Error(`${platform} 平台页面解析未在 Day12 实现，请提供可直接播放的视频文件 URL`);
    },
  };
}

export const DouyinReferenceVideoImportProvider = notImplemented('Douyin');
export const TikTokReferenceVideoImportProvider = notImplemented('TikTok');
export const InstagramReferenceVideoImportProvider = notImplemented('Instagram');
