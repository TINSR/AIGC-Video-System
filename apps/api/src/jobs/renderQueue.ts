import { Queue } from 'bullmq';
import { redis, redisAvailable } from '../config/redis';
import { RenderService } from '../modules/render/render.service';

const renderService = new RenderService();

export interface RenderJobData {
  taskId: string;
  creativePlanId: string;
  productId: string;
  provider: 'seedance_1_5' | 'ffmpeg_fallback';
  aspectRatio: '9:16' | '16:9';
  withTts: boolean;
  withBgm: boolean;
  fallbackToFfmpeg: boolean;
}

let renderQueue: Queue<RenderJobData> | null = null;

if (redisAvailable) {
  renderQueue = new Queue('render-jobs', {
    connection: redis,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      removeOnComplete: 100,
      removeOnFail: 100,
    },
  });
} else {
  console.warn('⚠️ 队列功能已禁用，将使用同步渲染模式');
}

export const addRenderJob = async (data: RenderJobData) => {
  if (renderQueue) {
    const job = await renderQueue.add('render-video', data);
    return job.id;
  } else {
    // Redis版本不足时，使用同步模拟渲染
    console.log(`⚠️ 同步模式：创建渲染任务 ${data.taskId}`);
    return `sync-${Date.now()}`;
  }
};
