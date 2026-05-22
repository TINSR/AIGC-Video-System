import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import { Seedance15Provider } from '../../providers/video/Seedance15Provider';
import { FFmpegComposeProvider } from '../../providers/video/FFmpegComposeProvider';
import type { GenerationTask, CreativePlan, Material, TaskLog } from '@shared/types';

// Day 1 任务进度约定
const STEP_MAP: Record<number, string> = {
  0: '任务已创建',
  10: '读取 CreativePlan 和素材',
  25: 'Seedance 1.5 生成分镜片段',
  40: '生成字幕和准备配音',
  60: 'FFmpeg 后处理',
  80: '拼接视频与 BGM',
  95: '导出 mp4',
  100: '生成完成',
};

function makeLog(level: TaskLog['level'], message: string): TaskLog {
  return {
    id: uuidv4(),
    level,
    message,
    timestamp: new Date().toISOString(),
  };
}

// Day 1 兜底任务存储（数据库未实现前）
const taskStore = new Map<string, GenerationTask>();

export class RenderService {
  private seedanceProvider: Seedance15Provider;
  private ffmpegProvider: FFmpegComposeProvider;

  constructor() {
    this.seedanceProvider = new Seedance15Provider();
    this.ffmpegProvider = new FFmpegComposeProvider();
  }

  // 创建渲染任务
  async createRenderTask(creativePlan: CreativePlan, materials: Material[]): Promise<GenerationTask> {
    if (!creativePlan.scenes || creativePlan.scenes.length === 0) {
      throw new Error('创意方案无分镜，无法创建渲染任务');
    }
    if (!creativePlan.visualBible) {
      throw new Error('创意方案缺少 VisualBible，无法创建渲染任务');
    }

    const task: GenerationTask = {
      id: uuidv4(),
      productId: creativePlan.productId,
      creativePlanId: creativePlan.id,
      status: 'pending',
      progress: 0,
      currentStep: STEP_MAP[0],
      logs: [makeLog('info', '任务已创建')],
      provider: 'seedance_1_5',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 写入内存存储，确保 getTaskStatus 可查询
    taskStore.set(task.id, task);

    // 异步执行渲染任务
    this.executeRenderTask(task, creativePlan, materials).catch(error => {
      console.error('渲染任务失败:', error);
      // 确保异常也被写入 store
      task.status = 'failed';
      task.errorMessage = error instanceof Error ? error.message : '渲染异常';
      task.logs.push(makeLog('error', `渲染异常：${task.errorMessage}`));
      task.updatedAt = new Date().toISOString();
      taskStore.set(task.id, task);
    });

    return task;
  }

  // 执行渲染任务 — 每次状态变更后同步写入 taskStore
  private async executeRenderTask(
    task: GenerationTask,
    creativePlan: CreativePlan,
    materials: Material[]
  ): Promise<void> {
    try {
      task.status = 'running';
      task.progress = 10;
      task.currentStep = STEP_MAP[10];
      task.logs.push(makeLog('info', '开始读取 CreativePlan 和素材'));
      task.updatedAt = new Date().toISOString();
      taskStore.set(task.id, task);

      task.progress = 25;
      task.currentStep = STEP_MAP[25];
      task.logs.push(makeLog('info', '开始调用 Seedance API'));
      task.updatedAt = new Date().toISOString();
      taskStore.set(task.id, task);

      const seedanceResult = await this.seedanceProvider.render({
        creativePlanId: creativePlan.id,
        scenes: creativePlan.scenes,
        materials,
        visualBible: creativePlan.visualBible,
        resolution: '1080p',
        aspectRatio: '9:16',
      });

      if (seedanceResult.status === 'failed') {
        task.provider = 'ffmpeg_fallback';
        task.progress = 30;
        task.currentStep = 'Seedance 调用失败，切换到 FFmpeg 兜底合成';
        task.logs.push(makeLog('warn', `Seedance 失败：${seedanceResult.errorMessage}，切换到 FFmpeg 兜底`));
        task.updatedAt = new Date().toISOString();
        taskStore.set(task.id, task);

        await this.renderWithFFmpeg(task, creativePlan, materials);
      } else {
        task.progress = 25;
        task.currentStep = STEP_MAP[25];
        task.logs.push(makeLog('info', `Seedance 任务提交成功，任务ID：${seedanceResult.taskId}`));
        task.updatedAt = new Date().toISOString();
        taskStore.set(task.id, task);

        await this.waitForSeedanceCompletion(task, seedanceResult.taskId, creativePlan, materials);
      }
    } catch (error) {
      task.status = 'failed';
      task.errorMessage = error instanceof Error ? error.message : '渲染失败';
      task.logs.push(makeLog('error', `渲染失败：${task.errorMessage}`));
      task.updatedAt = new Date().toISOString();
      taskStore.set(task.id, task);
    }
  }

  // 等待Seedance任务完成
  private async waitForSeedanceCompletion(
    task: GenerationTask,
    seedanceTaskId: string,
    creativePlan: CreativePlan,
    materials: Material[]
  ): Promise<void> {
    const maxRetries = 30;
    let retries = 0;

    while (retries < maxRetries) {
      const status = await this.seedanceProvider.getTaskStatus(seedanceTaskId);

      if (status.status === 'success') {
        task.progress = 40;
        task.currentStep = STEP_MAP[40];
        task.logs.push(makeLog('info', 'Seedance 生成完成，开始生成字幕和准备配音'));
        task.updatedAt = new Date().toISOString();
        taskStore.set(task.id, task);

        task.progress = 60;
        task.currentStep = STEP_MAP[60];
        task.logs.push(makeLog('info', '开始 FFmpeg 后处理'));
        task.updatedAt = new Date().toISOString();
        taskStore.set(task.id, task);

        task.progress = 95;
        task.currentStep = STEP_MAP[95];
        task.updatedAt = new Date().toISOString();
        taskStore.set(task.id, task);

        task.progress = 100;
        task.status = 'success';
        task.outputVideoUrl = `/outputs/${task.id}.mp4`;
        task.currentStep = STEP_MAP[100];
        task.logs.push(makeLog('info', '视频生成完成'));
        task.updatedAt = new Date().toISOString();
        taskStore.set(task.id, task);
        return;
      } else if (status.status === 'failed') {
        task.provider = 'ffmpeg_fallback';
        task.progress = 30;
        task.currentStep = 'Seedance 生成失败，切换到 FFmpeg 兜底合成';
        task.logs.push(makeLog('warn', `Seedance 生成失败：${status.errorMessage}，切换到 FFmpeg 兜底`));
        task.updatedAt = new Date().toISOString();
        taskStore.set(task.id, task);

        await this.renderWithFFmpeg(task, creativePlan, materials);
        return;
      }

      // 更新进度供查询
      task.progress = Math.max(task.progress, 25 + Math.floor((status.progress / 100) * 5));
      task.updatedAt = new Date().toISOString();
      taskStore.set(task.id, task);

      retries++;
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    task.provider = 'ffmpeg_fallback';
    task.progress = 30;
    task.currentStep = 'Seedance 生成超时，切换到 FFmpeg 兜底合成';
    task.logs.push(makeLog('warn', 'Seedance 生成超时，切换到 FFmpeg 兜底'));
    task.updatedAt = new Date().toISOString();
    taskStore.set(task.id, task);

    await this.renderWithFFmpeg(task, creativePlan, materials);
  }

  // 使用FFmpeg兜底合成
  private async renderWithFFmpeg(
    task: GenerationTask,
    creativePlan: CreativePlan,
    materials: Material[]
  ): Promise<void> {
    try {
      task.progress = 40;
      task.currentStep = STEP_MAP[40];
      task.logs.push(makeLog('info', '开始 FFmpeg 视频合成'));
      task.updatedAt = new Date().toISOString();
      taskStore.set(task.id, task);

      const outputDir = './outputs';
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      const outputPath = `${outputDir}/${task.id}.mp4`;

      const result = await this.ffmpegProvider.generateFromPlan({
        plan: creativePlan,
        materials,
        outputPath,
      });

      if (result.success) {
        task.progress = 100;
        task.status = 'success';
        task.outputVideoUrl = result.videoUrl;
        task.currentStep = STEP_MAP[100];
        task.logs.push(makeLog('info', 'FFmpeg 合成完成'));
      } else {
        task.status = 'failed';
        task.errorMessage = result.errorMessage || 'FFmpeg 合成失败';
        task.logs.push(makeLog('error', `FFmpeg 合成失败：${task.errorMessage}`));
      }
    } catch (error) {
      task.status = 'failed';
      task.errorMessage = error instanceof Error ? error.message : 'FFmpeg 合成失败';
      task.logs.push(makeLog('error', `FFmpeg 合成失败：${task.errorMessage}`));
    } finally {
      task.updatedAt = new Date().toISOString();
      taskStore.set(task.id, task);
    }
  }

  // 获取任务状态 — 从内存 Map 查询
  async getTaskStatus(taskId: string): Promise<GenerationTask | null> {
    return taskStore.get(taskId) ?? null;
  }

  // 重试失败任务
  async retryTask(taskId: string): Promise<GenerationTask | null> {
    const task = taskStore.get(taskId);
    if (!task) return null;

    if (task.status !== 'failed') {
      throw new Error(`任务状态为 ${task.status}，只有 failed 状态的任务可以重试`);
    }

    // 重置为 pending 并重新入队
    task.status = 'pending';
    task.progress = 0;
    task.currentStep = STEP_MAP[0];
    task.errorMessage = undefined;
    task.logs.push(makeLog('info', '任务重试中'));
    task.updatedAt = new Date().toISOString();
    taskStore.set(task.id, task);

    // 构建占位 creativePlan（从已有 task 字段重建）
    const creativePlan: CreativePlan = {
      id: task.creativePlanId,
      productId: task.productId,
      status: 'approved',
      style: 'pain_point',
      title: '',
      hook: '',
      adCopy: '',
      cta: '',
      visualBible: {
        aspectRatio: '9:16',
        style: '默认',
        colorTone: '明亮',
        lighting: '自然光',
        cameraStyle: '特写',
        productAppearance: '默认',
        mainScenes: ['默认场景'],
        continuityRules: ['保持一致性'],
      },
      scenes: [],
      complianceWarnings: [],
      continuityWarnings: [],
      createdAt: task.createdAt,
    };

    this.executeRenderTask(task, creativePlan, []).catch(error => {
      console.error('重试任务失败:', error);
      task.status = 'failed';
      task.errorMessage = error instanceof Error ? error.message : '重试异常';
      task.logs.push(makeLog('error', `重试异常：${task.errorMessage}`));
      task.updatedAt = new Date().toISOString();
      taskStore.set(task.id, task);
    });

    return task;
  }
}
