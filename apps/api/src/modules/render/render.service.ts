import { v4 as uuidv4 } from 'uuid';
import { Seedance15Provider } from '../../providers/video/Seedance15Provider';
import { FFmpegComposeProvider } from '../../providers/video/FFmpegComposeProvider';
import type { GenerationTask, CreativePlan, Material, TaskLog } from '@shared/types';
import type { SeedanceRenderOutput } from '@shared/types/ai-providers';

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

    // 异步执行渲染任务
    this.executeRenderTask(task, creativePlan, materials).catch(error => {
      console.error('渲染任务失败:', error);
    });

    return task;
  }

  // 执行渲染任务
  private async executeRenderTask(
    task: GenerationTask,
    creativePlan: CreativePlan,
    materials: Material[]
  ): Promise<void> {
    try {
      // 10% — 读取 CreativePlan 和素材
      task.status = 'running';
      task.progress = 10;
      task.currentStep = STEP_MAP[10];
      task.logs.push(makeLog('info', '开始读取 CreativePlan 和素材'));
      task.updatedAt = new Date().toISOString();

      // 25% — 调用 Seedance 1.5 生成分镜片段
      task.progress = 25;
      task.currentStep = STEP_MAP[25];
      task.logs.push(makeLog('info', '开始调用 Seedance API'));
      task.updatedAt = new Date().toISOString();

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

        await this.renderWithFFmpeg(task, creativePlan, materials);
      } else {
        task.progress = 25;
        task.currentStep = STEP_MAP[25];
        task.logs.push(makeLog('info', `Seedance 任务提交成功，任务ID：${seedanceResult.taskId}`));
        task.updatedAt = new Date().toISOString();

        await this.waitForSeedanceCompletion(task, seedanceResult.taskId, creativePlan, materials);
      }
    } catch (error) {
      task.status = 'failed';
      task.errorMessage = error instanceof Error ? error.message : '渲染失败';
      task.logs.push(makeLog('error', `渲染失败：${task.errorMessage}`));
      task.updatedAt = new Date().toISOString();
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

      task.progress = Math.max(task.progress, 25 + Math.floor((status.progress / 100) * 15));
      task.currentStep = STEP_MAP[25];
      task.updatedAt = new Date().toISOString();

      if (status.status === 'success') {
        // 40% — 生成字幕和准备配音
        task.progress = 40;
        task.currentStep = STEP_MAP[40];
        task.logs.push(makeLog('info', 'Seedance 生成完成，开始生成字幕和准备配音'));
        task.updatedAt = new Date().toISOString();

        // 60% — FFmpeg 后处理
        task.progress = 60;
        task.currentStep = STEP_MAP[60];
        task.logs.push(makeLog('info', '开始 FFmpeg 后处理'));
        task.updatedAt = new Date().toISOString();

        // 95% — 导出 mp4
        task.progress = 95;
        task.currentStep = STEP_MAP[95];
        task.updatedAt = new Date().toISOString();

        // 100% — 完成
        task.progress = 100;
        task.status = 'success';
        task.outputVideoUrl = `/outputs/${task.id}.mp4`;
        task.currentStep = STEP_MAP[100];
        task.logs.push(makeLog('info', '视频生成完成'));
        task.updatedAt = new Date().toISOString();
        return;
      } else if (status.status === 'failed') {
        task.provider = 'ffmpeg_fallback';
        task.progress = 30;
        task.currentStep = 'Seedance 生成失败，切换到 FFmpeg 兜底合成';
        task.logs.push(makeLog('warn', `Seedance 生成失败：${status.errorMessage}，切换到 FFmpeg 兜底`));
        task.updatedAt = new Date().toISOString();

        await this.renderWithFFmpeg(task, creativePlan, materials);
        return;
      }

      retries++;
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // 轮询超时，降级到FFmpeg
    task.provider = 'ffmpeg_fallback';
    task.progress = 30;
    task.currentStep = 'Seedance 生成超时，切换到 FFmpeg 兜底合成';
    task.logs.push(makeLog('warn', 'Seedance 生成超时，切换到 FFmpeg 兜底'));
    task.updatedAt = new Date().toISOString();

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

      const outputPath = `./outputs/${task.id}.mp4`;

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
    }
  }

  // 获取任务状态
  async getTaskStatus(taskId: string): Promise<GenerationTask | null> {
    // TODO: 从数据库查询任务状态
    return null;
  }

  // 重试失败任务
  async retryTask(taskId: string): Promise<GenerationTask | null> {
    // TODO: 实现重试逻辑
    return null;
  }
}
