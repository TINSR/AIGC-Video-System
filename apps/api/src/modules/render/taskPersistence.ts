import prisma from '../../config/prisma';
import type { GenerationTask, TaskLog } from '@shared/types';

const MAX_ERROR_MESSAGE_LENGTH = 190;

function truncateErrorMessage(message?: string): string | null {
  if (!message) return null;
  if (message.length <= MAX_ERROR_MESSAGE_LENGTH) return message;
  return `${message.slice(0, MAX_ERROR_MESSAGE_LENGTH - 3)}...`;
}

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
    console.warn('[taskPersistence] read task failed, falling back to memory:', message);
    return null;
  }
}

export async function listTasksFromDatabase(limit = 20): Promise<GenerationTask[]> {
  try {
    const records = await prisma.generationTask.findMany({
      orderBy: { updatedAt: 'desc' },
      take: limit,
      include: { logs: { orderBy: { timestamp: 'asc' } } },
    });
    return records.map(mapDbTask);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn('[taskPersistence] list tasks failed, falling back to memory:', message);
    return [];
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
        errorMessage: truncateErrorMessage(task.errorMessage),
        type: 'render',
      },
      update: {
        status: task.status,
        progress: task.progress,
        currentStep: task.currentStep,
        provider: task.provider,
        outputVideoUrl: task.outputVideoUrl ?? null,
        errorMessage: truncateErrorMessage(task.errorMessage),
        updatedAt: new Date(),
      },
    });

    if (task.logs.length > 0) {
      const latest = task.logs[task.logs.length - 1];
      await prisma.taskLog.upsert({
        where: { id: latest.id },
        create: {
          id: latest.id,
          taskId: task.id,
          level: latest.level,
          message: latest.message,
          timestamp: new Date(latest.timestamp),
        },
        update: {
          level: latest.level,
          message: latest.message,
          timestamp: new Date(latest.timestamp),
        },
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn('[taskPersistence] persist task skipped:', message);
  }
}
