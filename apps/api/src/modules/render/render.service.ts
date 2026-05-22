import { v4 as uuidv4 } from 'uuid';
import { Seedance15Provider } from '../../providers/video/Seedance15Provider';
import { FFmpegComposeProvider } from '../../providers/video/FFmpegComposeProvider';
import type { GenerationTask, CreativePlan, Material } from '@shared/types';
import type { SeedanceRenderOutput } from '@shared/types/ai-providers';

export class RenderService {
  private seedanceProvider: Seedance15Provider;
  private ffmpegProvider: FFmpegComposeProvider;

  constructor() {
    this.seedanceProvider = new Seedance15Provider();
    this.ffmpegProvider = new FFmpegComposeProvider();
  }

  // 创建渲染任务
  async createRenderTask(creativePlan: CreativePlan, materials: Material[]): Promise<GenerationTask> {
    const task: GenerationTask = {
      id: uuidv4(),
      productId: creativePlan.productId,
      creativePlanId: creativePlan.id,
      status: 'pending',
      progress: 0,
      currentStep: '初始化任务',
      logs: [],
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
      // 1. 尝试使用Seedance 1.5生成
      task.status = 'running';
      task.progress = 10;
      task.currentStep = '调用Seedance API生成视频';
      task.logs.push({ timestamp: new Date().toISOString(), message: '开始调用Seedance API' });

      const seedanceResult = await this.seedanceProvider.render({
        creativePlanId: creativePlan.id,
        scenes: creativePlan.scenes,
        materials,
        visualBible: creativePlan.visualBible,
        resolution: '1080p',
        aspectRatio: '9:16',
      });

      if (seedanceResult.status === 'failed') {
        // Seedance失败，自动降级到FFmpeg
        task.provider = 'ffmpeg_fallback';
        task.progress = 30;
        task.currentStep = 'Seedance调用失败，切换到FFmpeg兜底合成';
        task.logs.push({ timestamp: new Date().toISOString(), message: `Seedance失败：${seedanceResult.errorMessage}，切换到FFmpeg兜底` });

        await this.renderWithFFmpeg(task, creativePlan, materials);
      } else {
        // Seedance任务提交成功，等待完成
        task.progress = 20;
        task.currentStep = '等待Seedance生成完成';
        task.logs.push({ timestamp: new Date().toISOString(), message: `Seedance任务提交成功，任务ID：${seedanceResult.taskId}` });

        await this.waitForSeedanceCompletion(task, seedanceResult.taskId, creativePlan, materials);
      }
    } catch (error) {
      task.status = 'failed';
      task.errorMessage = error instanceof Error ? error.message : '渲染失败';
      task.logs.push({ timestamp: new Date().toISOString(), message: `渲染失败：${task.errorMessage}` });
      task.updatedAt = new Date().toISOString();
      // TODO: 更新数据库任务状态
    }
  }

  // 等待Seedance任务完成
  private async waitForSeedanceCompletion(
    task: GenerationTask,
    seedanceTaskId: string,
    creativePlan: CreativePlan,
    materials: Material[]
  ): Promise<void> {
    const maxRetries = 30; // 最多轮询30次
    let retries = 0;

    while (retries < maxRetries) {
      const status = await this.seedanceProvider.getTaskStatus(seedanceTaskId);
      
      task.progress = Math.max(task.progress, status.progress);
      task.currentStep = `Seedance生成中：${status.progress}%`;
      task.updatedAt = new Date().toISOString();

      if (status.status === 'success') {
        // Seedance生成成功，进行后处理
        task.progress = 80;
        task.currentStep = 'Seedance生成完成，进行后处理';
        task.logs.push({ timestamp: new Date().toISOString(), message: 'Seedance生成成功，开始后处理' });

        // TODO: 调用FFmpeg进行字幕烧录、BGM添加等后处理
        // 模拟后处理完成
        task.progress = 100;
        task.status = 'success';
        task.outputVideoUrl = `/outputs/${task.id}.mp4`;
        task.currentStep = '视频生成完成';
        task.logs.push({ timestamp: new Date().toISOString(), message: '视频生成完成' });
        task.updatedAt = new Date().toISOString();
        return;
      } else if (status.status === 'failed') {
        // Seedance失败，降级到FFmpeg
        task.provider = 'ffmpeg_fallback';
        task.progress = 30;
        task.currentStep = 'Seedance生成失败，切换到FFmpeg兜底合成';
        task.logs.push({ timestamp: new Date().toISOString(), message: `Seedance生成失败：${status.errorMessage}，切换到FFmpeg兜底` });

        await this.renderWithFFmpeg(task, creativePlan, materials);
        return;
      }

      retries++;
      await new Promise(resolve => setTimeout(resolve, 2000)); // 每2秒轮询一次
    }

    // 轮询超时，降级到FFmpeg
    task.provider = 'ffmpeg_fallback';
    task.progress = 30;
    task.currentStep = 'Seedance生成超时，切换到FFmpeg兜底合成';
    task.logs.push({ timestamp: new Date().toISOString(), message: 'Seedance生成超时，切换到FFmpeg兜底' });

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
      task.currentStep = 'FFmpeg合成视频中';
      task.logs.push({ timestamp: new Date().toISOString(), message: '开始FFmpeg视频合成' });
      task.updatedAt = new Date().toISOString();

      const outputPath = `./outputs/${task.id}.mp4`;
      
      const result = await this.ffmpegProvider.generateFromPlan({
        plan: creativePlan,
        materials,
        outputPath,
        // TODO: 配置BGM和TTS
      });

      if (result.success) {
        task.progress = 100;
        task.status = 'success';
        task.outputVideoUrl = result.videoUrl;
        task.currentStep = '视频生成完成';
        task.logs.push({ timestamp: new Date().toISOString(), message: 'FFmpeg合成完成，视频生成成功' });
      } else {
        task.status = 'failed';
        task.errorMessage = result.errorMessage || 'FFmpeg合成失败';
        task.logs.push({ timestamp: new Date().toISOString(), message: `FFmpeg合成失败：${task.errorMessage}` });
      }
    } catch (error) {
      task.status = 'failed';
      task.errorMessage = error instanceof Error ? error.message : 'FFmpeg合成失败';
      task.logs.push({ timestamp: new Date().toISOString(), message: `FFmpeg合成失败：${task.errorMessage}` });
    } finally {
      task.updatedAt = new Date().toISOString();
      // TODO: 更新数据库任务状态
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
