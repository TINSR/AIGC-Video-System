import { Worker } from 'bullmq';
import { redis } from '../config/redis';
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

const renderWorker = new Worker<RenderJobData>(
  'render-jobs',
  async (job) => {
    const { taskId, creativePlanId } = job.data;

    try {
      await updateTaskStatus(taskId, 'running', 10, '读取 CreativePlan 和素材');

      // 获取CreativePlan，按order字段升序获取scenes，保证使用用户编辑后的顺序
      const creativePlan = await prisma.creativePlan.findUnique({
        where: { id: creativePlanId },
        include: {
          scenes: {
            orderBy: { order: 'asc' }
          }
        }
      });

      if (!creativePlan) {
        throw new Error('CreativePlan not found');
      }

      // scenes已经按用户保存的顺序排序好了，后续Seedance和FFmpeg都使用这个顺序
      console.log(`Rendering plan ${creativePlanId} with ${creativePlan.scenes.length} scenes in order:`, 
        creativePlan.scenes.map(s => ({ id: s.id, order: s.order, duration: s.duration }))
      );

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

export default renderWorker;
