import { Queue } from 'bullmq';
import { redis } from '../config/redis';

export const renderQueue = new Queue('render-jobs', {
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

export const addRenderJob = async (data: RenderJobData) => {
  const job = await renderQueue.add('render-video', data);
  return job.id;
};
