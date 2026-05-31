import fs from 'fs';
import path from 'path';
import type { GenerationTask } from '@shared/types';

export function enrichTaskOutputVideo(task: GenerationTask): GenerationTask {
  const url = task.outputVideoUrl;
  if (!url) return task;

  if (/^https?:\/\//i.test(url)) {
    return {
      ...task,
      outputVideoHint:
        '远端视频 URL 可能已过期；若无法播放请重新渲染或重新下载',
    };
  }

  if (url.startsWith('/outputs/')) {
    const outputDir = process.env.OUTPUT_DIR || './outputs';
    const localPath = path.join(outputDir, path.basename(url));
    if (!fs.existsSync(localPath)) {
      const message = '本地视频文件不存在，请重新渲染';
      return {
        ...task,
        outputVideoHint: message,
        errorMessage: task.errorMessage ?? message,
      };
    }
  }

  return task;
}
