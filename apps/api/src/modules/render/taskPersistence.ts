import prisma from '../../config/prisma';
import type { GenerationTask, TaskLog } from '@shared/types';

function mapDbTask(record: {
  id: string;
  productId: string;
  creativePlanId: string;
  status: string;
  progress: number;
  currentStep: string;
  provider: string;
  outputVideoUrl: string | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
  logs: Array<{
    id: string;
    level: string;
    message: string;
    timestamp: Date;
  }>;
}): GenerationTask {
  return {
    id: record.id,
    productId: record.productId,
    creativePlanId: record.creativePlanId,
    status: record.status as GenerationTask['status'],
    progress: record.progress,
    currentStep: record.currentStep,
    logs: record.logs.map(
      (log): TaskLog => ({
        id: log.id,
        level: log.level as TaskLog['level'],
        message: log.message,
        timestamp: log.timestamp.toISOString(),
      })
    ),
    outputVideoUrl: record.outputVideoUrl ?? undefined,
    provider: record.provider as GenerationTask['provider'],
    errorMessage: record.errorMessage ?? undefined,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    type: 'render',
  };
}

export async function loadTaskFromDatabase(taskId: string): Promise<GenerationTask | null> {
  try {
    const record = await prisma.generationTask.findUnique({
      where: { id: taskId },
      include: { logs: { orderBy: { timestamp: 'asc' } } },
    });
    if (!record) return null;
    return mapDbTask(record);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn('[taskPersistence] 读取任务失败，将使用内存:', message);
    return null;
  }
}

export async function persistTaskToDatabase(task: GenerationTask): Promise<void> {
  try {
    await prisma.generationTask.upsert({
      where: { id: task.id },
      create: {
        id: task.id,
        productId: task.productId,
        creativePlanId: task.creativePlanId,
        status: task.status,
        progress: task.progress,
        currentStep: task.currentStep,
        provider: task.provider,
        outputVideoUrl: task.outputVideoUrl ?? null,
        errorMessage: task.errorMessage ?? null,
        type: 'render',
      },
      update: {
        status: task.status,
        progress: task.progress,
        currentStep: task.currentStep,
        provider: task.provider,
        outputVideoUrl: task.outputVideoUrl ?? null,
        errorMessage: task.errorMessage ?? null,
        updatedAt: new Date(),
      },
    });

    if (task.logs.length > 0) {
      const latest = task.logs[task.logs.length - 1];
      await prisma.taskLog.create({
        data: {
          id: latest.id,
          taskId: task.id,
          level: latest.level,
          message: latest.message,
          timestamp: new Date(latest.timestamp),
        },
      }).catch(() => {
        // duplicate log id on repeated sync — safe to ignore
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn('[taskPersistence] 任务写入数据库跳过:', message);
  }
}
