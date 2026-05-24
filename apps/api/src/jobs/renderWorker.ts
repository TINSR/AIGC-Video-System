import { Worker } from 'bullmq';
import { redis, redisAvailable } from '../config/redis';
import prisma from '../config/prisma';
import { RenderJobData } from './renderQueue';

const updateTaskStatus = async (
  taskId: string,
  status: 'pending' | 'running' | 'success' | 'failed',
  progress: number,
  currentStep: string,
  logLevel: 'info' | 'warn' | 'error' = 'info',
  errorMessage?: string
) => {
  await prisma.generationTask.update({
    where: { id: taskId },
    data: {
      status,
      progress,
      currentStep,
      errorMessage,
      updatedAt: new Date(),
      logs: {
        create: {
          level: logLevel,
          message: currentStep,
        },
      },
    },
  });
};

let renderWorker: Worker<RenderJobData> | null = null;

if (redisAvailable) {
  renderWorker = new Worker<RenderJobData>(
    'render-jobs',
    async (job) => {
      const { taskId, creativePlanId } = job.data;

      try {
        await updateTaskStatus(taskId, 'running', 10, '读取 CreativePlan 和素材');

        await new Promise(resolve => setTimeout(resolve, 1000));

        await updateTaskStatus(taskId, 'running', 25, 'Seedance 1.5 生成分镜片段');

        await new Promise(resolve => setTimeout(resolve, 2000));

        await updateTaskStatus(taskId, 'running', 40, '生成字幕和准备配音');

        await new Promise(resolve => setTimeout(resolve, 1500));

        await updateTaskStatus(taskId, 'running', 60, 'FFmpeg 后处理');

        await new Promise(resolve => setTimeout(resolve, 2000));

        await updateTaskStatus(taskId, 'running', 80, '拼接视频与 BGM');

        await new Promise(resolve => setTimeout(resolve, 1500));

        await updateTaskStatus(taskId, 'running', 95, '导出 mp4');

        await new Promise(resolve => setTimeout(resolve, 1000));

        const outputVideoUrl = `/outputs/${taskId}.mp4`;

        await updateTaskStatus(taskId, 'success', 100, '生成完成', 'info');
        await prisma.generationTask.update({
          where: { id: taskId },
          data: { outputVideoUrl },
        });

        return { success: true, outputVideoUrl };
      } catch (error: any) {
        const errorMsg = error?.message || '未知错误';
        await updateTaskStatus(taskId, 'failed', Number(job.progress) || 0, `生成失败: ${errorMsg}`, 'error', errorMsg);
        throw error;
      }
    },
    { connection: redis }
  );

  renderWorker.on('ready', () => {
    console.log('✅ 视频渲染工作进程已启动');
  });

  renderWorker.on('failed', (job, err) => {
    console.error(`❌ 任务 ${job?.id} 失败:`, err);
  });
} else {
  console.warn('⚠️ Redis版本不足，视频渲染工作进程未启动');
}

export default renderWorker;
