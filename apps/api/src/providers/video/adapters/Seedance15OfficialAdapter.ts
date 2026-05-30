import type { SeedanceRenderInput, SeedanceRenderOutput, SeedanceTaskStatus } from '@shared/types/ai-providers';

type ArkTaskStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'expired' | string;
type ArkResponse = Record<string, unknown>;

export class Seedance15OfficialAdapter {
  private apiKey?: string;
  private baseUrl: string;
  private modelId: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
    this.baseUrl = (process.env.SEEDANCE_API_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3').replace(/\/$/, '');
    this.modelId = process.env.SEEDANCE_MODEL_ID || 'doubao-seedance-1-5-pro-251215';
  }

  async render(input: SeedanceRenderInput): Promise<SeedanceRenderOutput> {
    if (!this.apiKey) {
      return {
        taskId: `seedance-missing-key-${Date.now()}`,
        status: 'failed',
        progress: 0,
        errorMessage: 'SEEDANCE_API_KEY is not configured, fallback to FFmpeg',
      };
    }

    const response = await this.requestArk('/contents/generations/tasks', {
      method: 'POST',
      body: JSON.stringify(this.buildCreateTaskBody(input)),
    });
    const taskId = this.extractTaskId(response);

    if (!taskId) {
      return {
        taskId: `seedance-create-error-${Date.now()}`,
        status: 'failed',
        progress: 0,
        errorMessage: `Seedance create task response did not include id: ${JSON.stringify(response)}`,
      };
    }

    return {
      taskId,
      status: 'running',
      progress: 5,
    };
  }

  async getTaskStatus(taskId: string): Promise<SeedanceTaskStatus> {
    if (!this.apiKey) {
      return {
        taskId,
        status: 'failed',
        progress: 0,
        errorMessage: 'SEEDANCE_API_KEY is not configured',
      };
    }

    const response = await this.queryTask(taskId);
    const task = this.extractTaskObject(response);
    const rawStatus = this.getString(task, ['status']) || this.getString(response, ['status']) || 'running';
    const status = this.mapStatus(rawStatus);

    return {
      taskId,
      status,
      progress: this.extractProgress(rawStatus, task),
      videoUrl: this.extractVideoUrl(task),
      errorMessage: status === 'failed' ? this.extractErrorMessage(task, response) : undefined,
    };
  }

  private async queryTask(taskId: string): Promise<ArkResponse> {
    try {
      return await this.requestArk(`/contents/generations/tasks/${encodeURIComponent(taskId)}`, {
        method: 'GET',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes('404') && !message.includes('405')) {
        throw error;
      }

      return this.requestArk(`/contents/generations/tasks?filter.task_ids=${encodeURIComponent(taskId)}`, {
        method: 'GET',
      });
    }
  }

  private async requestArk(path: string, init: RequestInit): Promise<ArkResponse> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...(init.headers || {}),
      },
    });
    const text = await response.text();
    const data = text ? JSON.parse(text) as ArkResponse : {};

    if (!response.ok) {
      const message = this.extractErrorMessage(data, data) || text || response.statusText;
      throw new Error(`Seedance API ${response.status}: ${message}`);
    }

    return data;
  }

  private buildCreateTaskBody(input: SeedanceRenderInput): Record<string, unknown> {
    return {
      model: this.modelId,
      content: [
        {
          type: 'text',
          text: this.buildPrompt(input),
        },
      ],
      resolution: input.resolution === '4k' ? '1080p' : input.resolution || '720p',
      ratio: input.aspectRatio || '9:16',
      duration: this.clampDuration(input.scenes.reduce((sum, scene) => sum + scene.duration, 0)),
      generate_audio: process.env.SEEDANCE_GENERATE_AUDIO === 'true',
      watermark: false,
    };
  }

  private buildPrompt(input: SeedanceRenderInput): string {
    const sortedScenes = [...input.scenes].sort((a, b) => a.order - b.order);
    const vb = input.visualBible;

    // 产品信息段
    const productSection = [
      '【产品信息】',
      `商品外观：${vb.productAppearance}`,
      `适用场景：${vb.mainScenes.join('、')}`,
    ].join('\n');

    // 全局视觉设定段
    const visualSection = [
      '【全局视觉设定】',
      `风格：${vb.style}`,
      `色调：${vb.colorTone}`,
      `光线：${vb.lighting}`,
      `镜头风格：${vb.cameraStyle}`,
      `连贯性规则：${vb.continuityRules.join('；')}`,
    ].join('\n');

    // 分镜脚本段
    const scenePrompts = sortedScenes
      .map(scene => {
        const goalLabel = scene.goal ? { hook: '开场吸引', feature: '功能展示', proof: '效果证明', cta: '促单转化', full_demo: '完整演示' }[scene.goal] || scene.goal : '';
      const parts = [
        `分镜${scene.order}${goalLabel ? `（${goalLabel}）` : ''}（${scene.duration}秒）：`,
        scene.visualDescription,
        scene.seedancePrompt,
      ];
      if (scene.subtitle) parts.push(`字幕：${scene.subtitle}`);
      if (scene.voiceover) parts.push(`旁白：${scene.voiceover}`);
      if (scene.transition && scene.order < sortedScenes.length) parts.push(`转场：${scene.transition}`);
        return parts.join(' ');
      })
      .join('\n');

    const sceneSection = `【分镜脚本】\n${scenePrompts}`;

    // 要求段
    const requirements = [
      '【要求】',
      '- 竖屏 9:16，电商带货短视频',
      '- 商品始终清晰可见，不要出现与商品外观冲突的元素',
      '- 禁止改变商品颜色、形状、核心卖点',
      '- 字幕简洁有力，节奏适合 15 秒短视频',
      '- 画面明亮、真实、有购买吸引力',
      '- 总时长不超过 15 秒',
    ].join('\n');

    return [productSection, visualSection, sceneSection, requirements].join('\n\n');
  }

  private clampDuration(duration: number): number {
    const maxDuration = this.modelId.includes('2-0') ? 15 : 12;
    return Math.min(Math.max(Math.round(duration || 5), 4), maxDuration);
  }

  private extractTaskId(response: ArkResponse): string | undefined {
    return this.getString(response, ['id'])
      || this.getString(response, ['data', 'id'])
      || this.getString(response, ['task', 'id'])
      || this.getString(response, ['data', 'task', 'id']);
  }

  private extractTaskObject(response: ArkResponse): ArkResponse {
    const data = this.getObject(response, ['data']);
    const firstItem = this.getArray(response, ['data', 'items'])?.[0];
    const firstTask = this.getArray(response, ['data', 'tasks'])?.[0];
    if (this.isRecord(firstItem)) return firstItem;
    if (this.isRecord(firstTask)) return firstTask;
    return data || response;
  }

  private mapStatus(status: ArkTaskStatus): SeedanceTaskStatus['status'] {
    if (status === 'queued') return 'pending';
    if (status === 'succeeded') return 'success';
    if (['failed', 'expired', 'canceled', 'cancelled'].includes(status)) return 'failed';
    return 'running';
  }

  private extractProgress(status: ArkTaskStatus, task: ArkResponse): number {
    const progress = this.getNumber(task, ['progress']);
    if (progress !== undefined) return Math.max(0, Math.min(100, progress));
    if (status === 'succeeded') return 100;
    if (status === 'queued') return 10;
    if (status === 'running') return 50;
    return 0;
  }

  private extractVideoUrl(task: ArkResponse): string | undefined {
    return this.getString(task, ['video_url'])
      || this.getString(task, ['video_url', 'url'])
      || this.getString(task, ['output', 'video_url'])
      || this.getString(task, ['output', 'video_url', 'url'])
      || this.getString(task, ['result', 'video_url'])
      || this.getString(task, ['result', 'video_url', 'url'])
      || this.getString(task, ['content', 'video_url'])
      || this.getString(task, ['content', 'video_url', 'url'])
      || this.getMediaUrlFromContentArray(task);
  }

  private getMediaUrlFromContentArray(task: ArkResponse): string | undefined {
    const content = this.getArray(task, ['content']) || this.getArray(task, ['result', 'content']) || [];
    for (const item of content) {
      if (!this.isRecord(item)) continue;
      const url = this.getString(item, ['video_url'])
        || this.getString(item, ['video_url', 'url']);
      if (url) return url;
    }
    return undefined;
  }

  private extractErrorMessage(task: ArkResponse, response: ArkResponse): string {
    return this.getString(task, ['error', 'message'])
      || this.getString(task, ['error_message'])
      || this.getString(task, ['fail_reason'])
      || this.getString(task, ['message'])
      || this.getString(response, ['error', 'message'])
      || this.getString(response, ['message'])
      || 'Seedance task failed';
  }

  private getString(source: unknown, path: string[]): string | undefined {
    const value = this.getValue(source, path);
    return typeof value === 'string' && value.length > 0 ? value : undefined;
  }

  private getNumber(source: unknown, path: string[]): number | undefined {
    const value = this.getValue(source, path);
    return typeof value === 'number' ? value : undefined;
  }

  private getObject(source: unknown, path: string[]): ArkResponse | undefined {
    const value = this.getValue(source, path);
    return this.isRecord(value) ? value : undefined;
  }

  private getArray(source: unknown, path: string[]): unknown[] | undefined {
    const value = this.getValue(source, path);
    return Array.isArray(value) ? value : undefined;
  }

  private getValue(source: unknown, path: string[]): unknown {
    return path.reduce<unknown>((current, key) => {
      if (!this.isRecord(current)) return undefined;
      return current[key];
    }, source);
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }
}
