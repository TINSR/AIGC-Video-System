import { randomUUID } from 'crypto';
import * as fs from 'fs';
import { isFfmpegFallbackAllowed, FFMPEG_FALLBACK_DISABLED_MESSAGE } from '../../config/ffmpegFallback';
import { Seedance15Provider } from '../../providers/video/Seedance15Provider';
import { FFmpegComposeProvider } from '../../providers/video/FFmpegComposeProvider';
import { createTtsProvider } from '../../providers/tts/ttsProviders';
import type { ITtsProvider } from '../../providers/tts/ITtsProvider';
import { taskStore, planStore, taskMaterialsStore } from '../../memory-store';
import { downloadVideoToOutputs } from '../../utils/videoDownload';
import { enrichTaskOutputVideo } from '../../utils/outputVideoUrl';
import { CreativePlanService } from '../creative-plans/creativePlan.service';
import { SmartEditService } from '../smart-edit/smartEdit.service';
import { listTasksFromDatabase, loadTaskFromDatabase, persistTaskToDatabase } from './taskPersistence';
import type { GenerationTask, CreativePlan, Material, Scene, TaskLog } from '@shared/types';

export type SmartClipRenderOptions = {
  withSubtitle?: boolean;
  withTts?: boolean;
  withBgm?: boolean;
};

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

const SMART_CLIP_STEP_MAP: Record<number, string> = {
  0: '任务已创建',
  10: '读取方案与素材',
  25: '分析素材 clips',
  40: '匹配分镜',
  50: '正在生成 AI 配音',
  60: '准备字幕和音轨',
  75: 'FFmpeg 智能剪辑合成',
  90: '检查输出文件',
  100: '智能剪辑完成',
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
  private creativePlanService: CreativePlanService;
  private smartEditService: SmartEditService;
  private ttsProvider: ITtsProvider;

  constructor() {
    this.seedanceProvider = new Seedance15Provider();
    this.ffmpegProvider = new FFmpegComposeProvider();
    this.creativePlanService = new CreativePlanService();
    this.smartEditService = new SmartEditService();
    this.ttsProvider = createTtsProvider();
  }

  private buildVoiceoverText(creativePlan: CreativePlan): string {
    const maxLen = parseInt(process.env.TTS_MAX_TEXT_LENGTH || '500', 10);
    const scenes = [...(creativePlan.scenes || [])].sort((a, b) => a.order - b.order);
    const parts: string[] = [];
    for (const scene of scenes) {
      const text = (scene.voiceover || scene.subtitle || '').trim();
      if (text) parts.push(text);
    }
    let joined = parts.join('。').replace(/\s+/g, ' ').replace(/[。！？]{2,}/g, '。');
    if (joined.length > maxLen) {
      const cut = joined.lastIndexOf('。', maxLen);
      if (cut > 0) joined = joined.slice(0, cut + 1);
      else joined = joined.slice(0, maxLen);
    }
    return joined;
  }

  private async failSeedanceWithoutFallback(task: GenerationTask, reason: string): Promise<void> {
    task.status = 'failed';
    task.provider = 'seedance_1_5';
    task.errorMessage = `${reason}。${FFMPEG_FALLBACK_DISABLED_MESSAGE}`;
    task.currentStep = 'Seedance 不可用，生产模式未启用 FFmpeg 兜底';
    task.logs.push(makeLog('error', task.errorMessage));
    task.updatedAt = new Date().toISOString();
    await syncTask(task);
  }

  private async fallbackToFullFfmpeg(
    task: GenerationTask,
    creativePlan: CreativePlan,
    materials: Material[],
    reason: string,
    stepLabel: string
  ): Promise<void> {
    if (!isFfmpegFallbackAllowed()) {
      await this.failSeedanceWithoutFallback(task, reason);
      return;
    }

    task.provider = 'ffmpeg_fallback';
    task.progress = 30;
    task.currentStep = stepLabel;
    task.logs.push(makeLog('warn', `${reason}，切换到 FFmpeg 兜底`));
    task.updatedAt = new Date().toISOString();
    await syncTask(task);
    await this.renderWithFFmpeg(task, creativePlan, materials);
  }

  private async fallbackToSceneFfmpeg(
    task: GenerationTask,
    creativePlan: CreativePlan,
    scene: Scene,
    materials: Material[],
    reason: string,
    outputBasename: string,
    outputUrl: string
  ): Promise<void> {
    if (!isFfmpegFallbackAllowed()) {
      await this.failSeedanceWithoutFallback(task, reason);
      await this.creativePlanService.updateScene(creativePlan.id, scene.id, {
        renderStatus: 'failed',
      });
      return;
    }

    task.logs.push(makeLog('warn', `${reason}，切换 FFmpeg 预览`));
    task.updatedAt = new Date().toISOString();
    await syncTask(task);
    await this.renderSceneWithFFmpeg(task, creativePlan, scene, materials, outputBasename, outputUrl);
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
      type: 'render',
      renderMode: 'full_video',
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

  async createSmartClipRenderTask(
    creativePlan: CreativePlan,
    materials: Material[],
    options: SmartClipRenderOptions = {}
  ): Promise<GenerationTask> {
    if (!creativePlan.scenes || creativePlan.scenes.length === 0) {
      throw new Error('创意方案无分镜，无法创建智能剪辑任务');
    }

    const task: GenerationTask = {
      id: randomUUID(),
      productId: creativePlan.productId,
      creativePlanId: creativePlan.id,
      status: 'pending',
      progress: 0,
      currentStep: SMART_CLIP_STEP_MAP[0],
      logs: [makeLog('info', '智能剪辑任务已创建')],
      provider: 'smart_clip_edit',
      type: 'render',
      renderMode: 'smart_clip_edit',
      renderOptions: {
        withSubtitle: options.withSubtitle ?? true,
        withTts: options.withTts ?? false,
        withBgm: options.withBgm ?? false,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await syncTask(task);
    taskMaterialsStore.set(task.id, materials);

    this.executeSmartClipRenderTask(task, creativePlan, materials, options).catch(async (error) => {
      console.error('智能剪辑任务失败:', error);
      task.status = 'failed';
      task.errorMessage = error instanceof Error ? error.message : '智能剪辑异常';
      task.logs.push(makeLog('error', `智能剪辑异常：${task.errorMessage}`));
      task.updatedAt = new Date().toISOString();
      await syncTask(task);
    });

    return task;
  }

  private async executeSmartClipRenderTask(
    task: GenerationTask,
    creativePlan: CreativePlan,
    materials: Material[],
    options: SmartClipRenderOptions
  ): Promise<void> {
    let voiceoverUrl: string | undefined;
    try {
      task.status = 'running';
      task.progress = 10;
      task.currentStep = SMART_CLIP_STEP_MAP[10];
      task.logs.push(
        makeLog('info', `读取 CreativePlan (${creativePlan.id})，共 ${creativePlan.scenes.length} 个分镜`)
      );
      task.updatedAt = new Date().toISOString();
      await syncTask(task);

      task.progress = 25;
      task.currentStep = SMART_CLIP_STEP_MAP[25];
      task.logs.push(makeLog('info', '分析素材 clips'));
      task.updatedAt = new Date().toISOString();
      await syncTask(task);

      let smartEditPlan;
      try {
        smartEditPlan = await this.smartEditService.getPlan(creativePlan.id);
      } catch {
        smartEditPlan = await this.smartEditService.buildPlan(creativePlan.id, true);
      }

      task.progress = 40;
      task.currentStep = SMART_CLIP_STEP_MAP[40];
      task.logs.push(
        makeLog(
          'info',
          `匹配分镜完成：${smartEditPlan.decisions.map((item) => `scene${item.sceneOrder}=${item.clip?.id ?? 'fallback'}(${item.score})`).join(', ')}`
        )
      );
      task.updatedAt = new Date().toISOString();
      await syncTask(task);

      // TTS voiceover
      if (options.withTts) {
        task.progress = 50;
        task.currentStep = SMART_CLIP_STEP_MAP[50];
        task.updatedAt = new Date().toISOString();
        await syncTask(task);

        const voiceoverText = this.buildVoiceoverText(creativePlan);
        if (voiceoverText.length > 0) {
          task.logs.push(makeLog('info', `准备 AI 配音文本，共 ${voiceoverText.length} 个字符`));
          try {
            const ttsResult = await this.ttsProvider.synthesize(voiceoverText);
            if (ttsResult && ttsResult.localFilePath) {
              voiceoverUrl = ttsResult.localFilePath;
              task.logs.push(makeLog('info', `AI 配音生成成功，时长约 ${ttsResult.duration} 秒`));
            } else {
              task.logs.push(makeLog('warn', 'AI 配音生成失败，自动降级为字幕版视频'));
            }
          } catch (err) {
            task.logs.push(makeLog('warn', `AI 配音异常，自动降级为字幕版视频：${err instanceof Error ? err.message : err}`));
          }
        } else {
          task.logs.push(makeLog('warn', '分镜无旁白文本，跳过 AI 配音'));
        }
      } else {
        task.logs.push(makeLog('info', '未开启 AI 配音，使用字幕版视频'));
      }

      task.progress = 60;
      task.currentStep = SMART_CLIP_STEP_MAP[60];
      task.updatedAt = new Date().toISOString();
      await syncTask(task);

      const ffmpegCheck = await this.ffmpegProvider.checkFFmpegAvailability();
      if (!ffmpegCheck.available) {
        task.status = 'failed';
        task.errorMessage = `FFmpeg 不可用：${ffmpegCheck.error}`;
        task.logs.push(makeLog('error', task.errorMessage));
        task.updatedAt = new Date().toISOString();
        await syncTask(task);
        return;
      }

      task.progress = 75;
      task.currentStep = SMART_CLIP_STEP_MAP[75];
      task.logs.push(makeLog('info', `FFmpeg 可用（版本: ${ffmpegCheck.version}），开始智能剪辑合成`));
      task.updatedAt = new Date().toISOString();
      await syncTask(task);

      const outputDir = process.env.OUTPUT_DIR || './outputs';
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      const outputPath = `${outputDir}/${task.id}.mp4`;
      const sceneDurations = this.smartEditService.getSceneDurationsForPlan(
        creativePlan.id,
        creativePlan.scenes
      );

      const result = await this.ffmpegProvider.generateFromSmartEdit({
        plan: creativePlan,
        decisions: smartEditPlan.decisions,
        sceneDurations,
        outputPath,
        withSubtitle: options.withSubtitle !== false,
        bgmUrl: options.withBgm ? process.env.SMART_EDIT_BGM_URL : undefined,
        voiceoverUrl,
      });

      task.progress = 90;
      task.currentStep = SMART_CLIP_STEP_MAP[90];
      task.updatedAt = new Date().toISOString();
      await syncTask(task);

      if (result.success && fs.existsSync(outputPath)) {
        task.progress = 100;
        task.status = 'success';
        task.outputVideoUrl = `/outputs/${task.id}.mp4`;
        task.currentStep = SMART_CLIP_STEP_MAP[100];
        task.logs.push(makeLog('info', `智能剪辑完成，输出：${task.outputVideoUrl}`));
      } else {
        task.status = 'failed';
        task.errorMessage = result.errorMessage || 'SMART_EDIT_FAILED';
        task.logs.push(makeLog('error', `智能剪辑失败：${task.errorMessage}`));
      }
    } catch (error) {
      task.status = 'failed';
      task.errorMessage = error instanceof Error ? error.message : 'SMART_EDIT_FAILED';
      task.logs.push(makeLog('error', `智能剪辑失败：${task.errorMessage}`));
    } finally {
      // Clean up TTS temporary WAV file
      if (voiceoverUrl && fs.existsSync(voiceoverUrl)) {
        try {
          fs.unlinkSync(voiceoverUrl);
          task.logs.push(makeLog('info', '已清理 TTS 临时文件'));
        } catch (cleanupErr) {
          task.logs.push(makeLog('warn', `清理 TTS 临时文件失败：${cleanupErr instanceof Error ? cleanupErr.message : cleanupErr}`));
        }
      }
      task.updatedAt = new Date().toISOString();
      await syncTask(task);
    }
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
        await this.fallbackToFullFfmpeg(
          task,
          creativePlan,
          materials,
          `Seedance 失败：${seedanceResult.errorMessage}`,
          'Seedance 调用失败，切换到 FFmpeg 兜底合成'
        );
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

        await this.fallbackToFullFfmpeg(
          task,
          creativePlan,
          materials,
          'Seedance 生成完成但未返回 videoUrl',
          'Seedance 生成完成但未返回视频 URL，切换到 FFmpeg 兜底合成'
        );
        return;
      } else if (status.status === 'failed') {
        await this.fallbackToFullFfmpeg(
          task,
          creativePlan,
          materials,
          `Seedance 生成失败：${status.errorMessage}`,
          'Seedance 生成失败，切换到 FFmpeg 兜底合成'
        );
        return;
      }

      task.progress = Math.max(task.progress, 25 + Math.floor((status.progress / 100) * 70));
      task.updatedAt = new Date().toISOString();
      await syncTask(task);

      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }

    await this.fallbackToFullFfmpeg(
      task,
      creativePlan,
      materials,
      'Seedance 生成超时',
      'Seedance 生成超时，切换到 FFmpeg 兜底合成'
    );
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

  // 分镜级预览渲染 — 不影响整片 render，成功后写回 scene.previewVideoUrl
  async createSceneRenderTask(
    creativePlan: CreativePlan,
    sceneId: string,
    materials: Material[]
  ): Promise<GenerationTask> {
    const scene = creativePlan.scenes.find((s) => s.id === sceneId);
    if (!scene) {
      throw new Error(`分镜 ${sceneId} 不存在`);
    }
    if (!creativePlan.visualBible) {
      throw new Error('创意方案缺少 VisualBible，无法渲染分镜');
    }

    await this.creativePlanService.updateScene(creativePlan.id, sceneId, {
      renderStatus: 'running',
    });

    const task: GenerationTask = {
      id: randomUUID(),
      productId: creativePlan.productId,
      creativePlanId: creativePlan.id,
      status: 'pending',
      progress: 0,
      currentStep: '分镜预览任务已创建',
      logs: [makeLog('info', `分镜预览任务已创建（scene=${sceneId}）`)],
      provider: 'seedance_1_5',
      type: 'scene_render',
      renderMode: 'scene_clips',
      resultId: sceneId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await syncTask(task);
    taskMaterialsStore.set(task.id, materials);

    this.executeSceneRenderTask(task, creativePlan, scene, materials).catch(async (error) => {
      console.error('分镜渲染失败:', error);
      task.status = 'failed';
      task.errorMessage = error instanceof Error ? error.message : '分镜渲染异常';
      task.logs.push(makeLog('error', `分镜渲染异常：${task.errorMessage}`));
      task.updatedAt = new Date().toISOString();
      await syncTask(task);
      await this.creativePlanService.updateScene(creativePlan.id, sceneId, {
        renderStatus: 'failed',
      });
    });

    return task;
  }

  private async executeSceneRenderTask(
    task: GenerationTask,
    creativePlan: CreativePlan,
    scene: Scene,
    materials: Material[]
  ): Promise<void> {
    const outputBasename = `scene-${scene.id}-${task.id}`;
    const outputUrl = `/outputs/${outputBasename}.mp4`;

    try {
      task.status = 'running';
      task.progress = 10;
      task.currentStep = `读取分镜 ${scene.order}，准备生成预览`;
      task.logs.push(makeLog('info', task.currentStep));
      task.updatedAt = new Date().toISOString();
      await syncTask(task);

      const hasKey = !!process.env.SEEDANCE_API_KEY;
      task.logs.push(makeLog('info', `分镜 Seedance prompt（API Key ${hasKey ? '已配置' : '未配置'}）`));
      task.updatedAt = new Date().toISOString();
      await syncTask(task);

      const seedanceResult = await this.seedanceProvider.render({
        creativePlanId: creativePlan.id,
        scenes: [scene],
        materials,
        visualBible: creativePlan.visualBible,
        resolution: '1080p',
        aspectRatio: creativePlan.visualBible.aspectRatio || '9:16',
      });

      if (seedanceResult.status === 'failed') {
        await this.fallbackToSceneFfmpeg(
          task,
          creativePlan,
          scene,
          materials,
          `分镜 Seedance 失败：${seedanceResult.errorMessage}`,
          outputBasename,
          outputUrl
        );
        return;
      }

      task.currentStep = '已提交分镜 Seedance 任务，等待远端生成';
      task.logs.push(makeLog('info', `已提交分镜 Seedance 任务，ID：${seedanceResult.taskId}`));
      task.progress = 25;
      task.updatedAt = new Date().toISOString();
      await syncTask(task);

      await this.waitForSeedanceSceneCompletion(
        task,
        seedanceResult.taskId,
        creativePlan,
        scene,
        materials,
        outputBasename,
        outputUrl
      );
    } catch (error) {
      task.status = 'failed';
      task.errorMessage = error instanceof Error ? error.message : '分镜渲染失败';
      task.logs.push(makeLog('error', task.errorMessage));
      task.updatedAt = new Date().toISOString();
      await syncTask(task);
      await this.creativePlanService.updateScene(creativePlan.id, scene.id, {
        renderStatus: 'failed',
      });
    }
  }

  private async waitForSeedanceSceneCompletion(
    task: GenerationTask,
    seedanceTaskId: string,
    creativePlan: CreativePlan,
    scene: Scene,
    materials: Material[],
    outputBasename: string,
    outputUrl: string
  ): Promise<void> {
    const pollIntervalMs = Math.max(Number(process.env.SEEDANCE_POLL_INTERVAL_MS) || 5000, 1000);
    const maxWaitMs = Math.max(Number(process.env.SEEDANCE_SCENE_POLL_TIMEOUT_MS) || 10 * 60 * 1000, pollIntervalMs);
    const heartbeatIntervalMs = Math.max(Number(process.env.SEEDANCE_HEARTBEAT_INTERVAL_MS) || 30_000, 10_000);
    const startedAt = Date.now();
    let lastHeartbeatAt = startedAt;

    while (Date.now() - startedAt < maxWaitMs) {
      const elapsedSec = Math.floor((Date.now() - startedAt) / 1000);
      if (Date.now() - lastHeartbeatAt >= heartbeatIntervalMs) {
        task.currentStep = `分镜远端生成中，已等待 ${elapsedSec} 秒`;
        task.logs.push(makeLog('info', task.currentStep));
        task.updatedAt = new Date().toISOString();
        await syncTask(task);
        lastHeartbeatAt = Date.now();
      }

      const status = await this.seedanceProvider.getTaskStatus(seedanceTaskId);

      if (status.status === 'success' && status.videoUrl) {
        task.currentStep = '分镜 Seedance 成功，开始下载预览视频';
        task.logs.push(makeLog('info', task.currentStep));
        task.updatedAt = new Date().toISOString();
        await syncTask(task);

        const download = await downloadVideoToOutputs(status.videoUrl, outputBasename);
        if (download.ok) {
          await this.finishSceneRenderSuccess(task, creativePlan.id, scene.id, outputUrl, download.localUrl);
          return;
        }

        task.outputVideoUrl = status.videoUrl;
        task.status = 'success';
        task.progress = 100;
        task.currentStep = '分镜预览完成（使用远端 URL）';
        task.logs.push(makeLog('warn', `分镜视频落盘失败：${download.reason}，保留远端 URL`));
        task.updatedAt = new Date().toISOString();
        await syncTask(task);
        await this.creativePlanService.updateScene(creativePlan.id, scene.id, {
          previewVideoUrl: status.videoUrl,
          renderStatus: 'success',
        });
        return;
      }

      if (status.status === 'failed') {
        await this.fallbackToSceneFfmpeg(
          task,
          creativePlan,
          scene,
          materials,
          `分镜 Seedance 失败：${status.errorMessage}`,
          outputBasename,
          outputUrl
        );
        return;
      }

      task.progress = Math.max(task.progress, 25 + Math.floor((status.progress / 100) * 60));
      task.updatedAt = new Date().toISOString();
      await syncTask(task);
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    await this.fallbackToSceneFfmpeg(
      task,
      creativePlan,
      scene,
      materials,
      '分镜 Seedance 超时',
      outputBasename,
      outputUrl
    );
  }

  private async renderSceneWithFFmpeg(
    task: GenerationTask,
    creativePlan: CreativePlan,
    scene: Scene,
    materials: Material[],
    outputBasename: string,
    outputUrl: string
  ): Promise<void> {
    task.provider = 'ffmpeg_fallback';
    const ffmpegCheck = await this.ffmpegProvider.checkFFmpegAvailability();
    if (!ffmpegCheck.available) {
      task.status = 'failed';
      task.errorMessage = `FFmpeg 不可用：${ffmpegCheck.error}`;
      task.logs.push(makeLog('error', task.errorMessage));
      task.updatedAt = new Date().toISOString();
      await syncTask(task);
      await this.creativePlanService.updateScene(creativePlan.id, scene.id, { renderStatus: 'failed' });
      return;
    }

    const outputDir = process.env.OUTPUT_DIR || './outputs';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    const outputPath = `${outputDir}/${outputBasename}.mp4`;
    const miniPlan: CreativePlan = { ...creativePlan, scenes: [scene] };

    task.currentStep = 'FFmpeg 生成分镜预览';
    task.logs.push(makeLog('info', task.currentStep));
    task.updatedAt = new Date().toISOString();
    await syncTask(task);

    const result = await this.ffmpegProvider.generateFromPlan({
      plan: miniPlan,
      materials,
      outputPath,
    });

    if (result.success && fs.existsSync(outputPath)) {
      await this.finishSceneRenderSuccess(task, creativePlan.id, scene.id, outputUrl, outputUrl);
      return;
    }

    task.status = 'failed';
    task.errorMessage = result.errorMessage || 'FFmpeg 分镜预览失败';
    task.logs.push(makeLog('error', task.errorMessage));
    task.updatedAt = new Date().toISOString();
    await syncTask(task);
    await this.creativePlanService.updateScene(creativePlan.id, scene.id, { renderStatus: 'failed' });
  }

  private async finishSceneRenderSuccess(
    task: GenerationTask,
    planId: string,
    sceneId: string,
    previewUrl: string,
    logUrl: string
  ): Promise<void> {
    task.status = 'success';
    task.progress = 100;
    task.outputVideoUrl = previewUrl;
    task.currentStep = '分镜预览生成完成';
    task.logs.push(makeLog('info', `分镜预览已保存：${logUrl}`));
    task.updatedAt = new Date().toISOString();
    await syncTask(task);
    await this.creativePlanService.updateScene(planId, sceneId, {
      previewVideoUrl: previewUrl,
      renderStatus: 'success',
    });
  }

  // 获取任务状态 — 优先 MySQL，fallback 内存
  async getTaskStatus(taskId: string): Promise<GenerationTask | null> {
    const fromDb = await loadTaskFromDatabase(taskId);
    if (fromDb) {
      taskStore.set(taskId, fromDb);
      return enrichTaskOutputVideo(fromDb);
    }
    const fromMemory = taskStore.get(taskId);
    return fromMemory ? enrichTaskOutputVideo(fromMemory) : null;
  }

  async listTasks(limit = 20): Promise<GenerationTask[]> {
    const fromDb = await listTasksFromDatabase(limit);
    if (fromDb.length > 0) {
      fromDb.forEach((task) => taskStore.set(task.id, task));
      return fromDb.map(enrichTaskOutputVideo);
    }

    return Array.from(taskStore.values())
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
      .slice(0, limit)
      .map(enrichTaskOutputVideo);
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

    const retryPromise = task.renderMode === 'smart_clip_edit'
      ? this.executeSmartClipRenderTask(task, creativePlan, materials, task.renderOptions ?? {
          withSubtitle: true,
          withTts: false,
          withBgm: false,
        })
      : this.executeRenderTask(task, creativePlan, materials);

    retryPromise.catch(async (error) => {
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
