import { randomUUID } from 'crypto';
import * as fs from 'fs';
import { Seedance15Provider } from '../../providers/video/Seedance15Provider';
import { FFmpegComposeProvider } from '../../providers/video/FFmpegComposeProvider';
import { taskStore, planStore, taskMaterialsStore } from '../../memory-store';
import { downloadVideoToOutputs } from '../../utils/videoDownload';
import { listTasksFromDatabase, loadTaskFromDatabase, persistTaskToDatabase } from './taskPersistence';
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
    id: randomUUID(),
    level,
    message,
    timestamp: new Date().toISOString(),
  };
}

async function syncTask(task: GenerationTask): Promise<void> {
  taskStore.set(task.id, task);
  await persistTaskToDatabase(task);
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
      id: randomUUID(),
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

    await syncTask(task);
    taskMaterialsStore.set(task.id, materials);

    this.executeRenderTask(task, creativePlan, materials).catch(async (error) => {
      console.error('渲染任务失败:', error);
      task.status = 'failed';
      task.errorMessage = error instanceof Error ? error.message : '渲染异常';
      task.logs.push(makeLog('error', `渲染异常：${task.errorMessage}`));
      task.updatedAt = new Date().toISOString();
      await syncTask(task);
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
      task.logs.push(makeLog('info', `读取 CreativePlan (${creativePlan.id})，共 ${creativePlan.scenes.length} 个分镜，${materials.length} 个素材`));
      task.updatedAt = new Date().toISOString();
      await syncTask(task);

      task.progress = 25;
      task.currentStep = STEP_MAP[25];
      const hasKey = !!process.env.SEEDANCE_API_KEY;
      task.logs.push(makeLog('info', `构建 Seedance prompt（API Key ${hasKey ? '已配置' : '未配置'}）`));
      task.updatedAt = new Date().toISOString();
      await syncTask(task);

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
        await syncTask(task);

        await this.renderWithFFmpeg(task, creativePlan, materials);
      } else {
        task.progress = 25;
        task.currentStep = STEP_MAP[25];
        task.currentStep = '已提交 Seedance 任务，等待远端生成';
        task.logs.push(makeLog('info', `已提交 Seedance 任务，ID：${seedanceResult.taskId}`));
        task.updatedAt = new Date().toISOString();
        await syncTask(task);

        await this.waitForSeedanceCompletion(task, seedanceResult.taskId, creativePlan, materials);
      }
    } catch (error) {
      task.status = 'failed';
      task.errorMessage = error instanceof Error ? error.message : '渲染失败';
      task.logs.push(makeLog('error', `渲染失败：${task.errorMessage}`));
      task.updatedAt = new Date().toISOString();
      await syncTask(task);
    }
  }

  // 等待Seedance任务完成
  private async waitForSeedanceCompletion(
    task: GenerationTask,
    seedanceTaskId: string,
    creativePlan: CreativePlan,
    materials: Material[]
  ): Promise<void> {
    const pollIntervalMs = Math.max(Number(process.env.SEEDANCE_POLL_INTERVAL_MS) || 5000, 1000);
    const maxWaitMs = Math.max(Number(process.env.SEEDANCE_POLL_TIMEOUT_MS) || 15 * 60 * 1000, pollIntervalMs);
    const heartbeatIntervalMs = Math.max(Number(process.env.SEEDANCE_HEARTBEAT_INTERVAL_MS) || 30_000, 10_000);
    const startedAt = Date.now();
    let lastHeartbeatAt = startedAt;

    while (Date.now() - startedAt < maxWaitMs) {
      const elapsedSec = Math.floor((Date.now() - startedAt) / 1000);
      if (Date.now() - lastHeartbeatAt >= heartbeatIntervalMs) {
        task.currentStep = `远端生成中，已等待 ${elapsedSec} 秒`;
        task.logs.push(makeLog('info', task.currentStep));
        task.updatedAt = new Date().toISOString();
        await syncTask(task);
        lastHeartbeatAt = Date.now();
      }

      const status = await this.seedanceProvider.getTaskStatus(seedanceTaskId);

      if (status.status === 'success') {
        if (status.videoUrl) {
          task.currentStep = 'Seedance 返回成功，开始下载视频';
          task.logs.push(makeLog('info', task.currentStep));
          task.progress = Math.max(task.progress, 90);
          task.updatedAt = new Date().toISOString();
          await syncTask(task);

          const download = await downloadVideoToOutputs(status.videoUrl, task.id);
          if (download.ok) {
            task.progress = 100;
            task.status = 'success';
            task.outputVideoUrl = download.localUrl;
            task.currentStep = STEP_MAP[100];
            task.logs.push(
              makeLog(
                'info',
                `视频已保存到 ${download.localUrl}（${download.bytes} bytes, ${download.contentType}）`
              )
            );
          } else {
            task.progress = 100;
            task.status = 'success';
            task.outputVideoUrl = status.videoUrl;
            task.currentStep = '生成完成（使用远端视频 URL）';
            task.logs.push(makeLog('warn', `远端视频落盘失败：${download.reason}，保留远端 URL`));
          }

          task.updatedAt = new Date().toISOString();
          await syncTask(task);
          return;
        }

        task.provider = 'ffmpeg_fallback';
        task.progress = 30;
        task.currentStep = 'Seedance 生成完成但未返回视频 URL，切换到 FFmpeg 兜底合成';
        task.logs.push(makeLog('warn', 'Seedance 生成完成但未返回 videoUrl，切换到 FFmpeg 兜底'));
        task.updatedAt = new Date().toISOString();
        await syncTask(task);

        await this.renderWithFFmpeg(task, creativePlan, materials);
        return;
      } else if (status.status === 'failed') {
        task.provider = 'ffmpeg_fallback';
        task.progress = 30;
        task.currentStep = 'Seedance 生成失败，切换到 FFmpeg 兜底合成';
        task.logs.push(makeLog('warn', `Seedance 生成失败：${status.errorMessage}，切换到 FFmpeg 兜底`));
        task.updatedAt = new Date().toISOString();
        await syncTask(task);

        await this.renderWithFFmpeg(task, creativePlan, materials);
        return;
      }

      task.progress = Math.max(task.progress, 25 + Math.floor((status.progress / 100) * 70));
      task.updatedAt = new Date().toISOString();
      await syncTask(task);

      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }

    task.provider = 'ffmpeg_fallback';
    task.progress = 30;
    task.currentStep = 'Seedance 生成超时，切换到 FFmpeg 兜底合成';
    task.logs.push(makeLog('warn', 'Seedance 生成超时，切换到 FFmpeg 兜底'));
    task.updatedAt = new Date().toISOString();
    await syncTask(task);

    await this.renderWithFFmpeg(task, creativePlan, materials);
  }

  // 使用FFmpeg兜底合成
  private async renderWithFFmpeg(
    task: GenerationTask,
    creativePlan: CreativePlan,
    materials: Material[]
  ): Promise<void> {
    try {
      // 检查 FFmpeg 可用性
      const ffmpegCheck = await this.ffmpegProvider.checkFFmpegAvailability();
      if (!ffmpegCheck.available) {
        task.status = 'failed';
        task.errorMessage = `FFmpeg 不可用：${ffmpegCheck.error}\n\n安装方法：\n1. winget install Gyan.FFmpeg\n2. 或下载 https://github.com/BtbN/FFmpeg-Builds/releases 并添加到 PATH\n3. 或设置环境变量 FFMPEG_PATH 指向 ffmpeg.exe 的完整路径`;
        task.logs.push(makeLog('error', task.errorMessage));
        task.updatedAt = new Date().toISOString();
        await syncTask(task);
        return;
      }

      task.progress = 40;
      task.currentStep = STEP_MAP[40];
      task.logs.push(makeLog('info', `FFmpeg 可用（版本: ${ffmpegCheck.version}），开始合成 ${creativePlan.scenes.length} 个分镜`));
      task.updatedAt = new Date().toISOString();
      await syncTask(task);

      const outputDir = process.env.OUTPUT_DIR || './outputs';
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      const outputPath = `${outputDir}/${task.id}.mp4`;

      const result = await this.ffmpegProvider.generateFromPlan({
        plan: creativePlan,
        materials,
        outputPath,
      });

      if (result.success && fs.existsSync(outputPath)) {
        task.progress = 100;
        task.status = 'success';
        task.outputVideoUrl = `/outputs/${task.id}.mp4`;
        task.currentStep = STEP_MAP[100];
        task.logs.push(makeLog('info', `FFmpeg 合成完成，输出：/outputs/${task.id}.mp4`));
      } else if (result.success) {
        task.status = 'failed';
        task.errorMessage = 'FFmpeg 报告成功但本地输出文件不存在';
        task.logs.push(makeLog('error', task.errorMessage));
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
      await syncTask(task);
    }
  }

  // 获取任务状态 — 优先 MySQL，fallback 内存
  async getTaskStatus(taskId: string): Promise<GenerationTask | null> {
    const fromDb = await loadTaskFromDatabase(taskId);
    if (fromDb) {
      taskStore.set(taskId, fromDb);
      return fromDb;
    }
    return taskStore.get(taskId) ?? null;
  }

  async listTasks(limit = 20): Promise<GenerationTask[]> {
    const fromDb = await listTasksFromDatabase(limit);
    if (fromDb.length > 0) {
      fromDb.forEach((task) => taskStore.set(task.id, task));
      return fromDb;
    }

    return Array.from(taskStore.values())
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
      .slice(0, limit);
  }

  // 重试失败任务 — 从 planStore 读取真实 CreativePlan
  async retryTask(taskId: string): Promise<GenerationTask | null> {
    const task = taskStore.get(taskId);
    if (!task) return null;

    if (task.status !== 'failed') {
      throw new Error(`任务状态为 ${task.status}，只有 failed 状态的任务可以重试`);
    }

    // 从共享 store 读取真实的 CreativePlan
    const creativePlan = planStore.get(task.creativePlanId);
    if (!creativePlan) {
      throw new Error(`关联的创意方案 ${task.creativePlanId} 不存在，无法重试`);
    }

    const materials = taskMaterialsStore.get(taskId) ?? [];

    // 重置为 pending
    task.status = 'pending';
    task.progress = 0;
    task.currentStep = STEP_MAP[0];
    task.errorMessage = undefined;
    task.logs.push(makeLog('info', '任务重试中'));
    task.updatedAt = new Date().toISOString();
    await syncTask(task);

    this.executeRenderTask(task, creativePlan, materials).catch(async (error) => {
      console.error('重试任务失败:', error);
      task.status = 'failed';
      task.errorMessage = error instanceof Error ? error.message : '重试异常';
      task.logs.push(makeLog('error', `重试异常：${task.errorMessage}`));
      task.updatedAt = new Date().toISOString();
      await syncTask(task);
    });

    return task;
  }
}
