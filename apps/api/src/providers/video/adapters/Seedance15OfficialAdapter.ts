import * as fs from 'fs';
import * as path from 'path';
import type { SeedanceRenderInput, SeedanceRenderOutput, SeedanceTaskStatus, VideoModelCapabilities } from '@shared/types/ai-providers';

type ArkTaskStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'expired' | string;
type ArkResponse = Record<string, unknown>;

export class Seedance15OfficialAdapter {
  private apiKey?: string;
  private baseUrl: string;
  private modelId: string;
  private modelVersion: '1.5' | '2.0';

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
    this.baseUrl = (process.env.SEEDANCE_API_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3').replace(/\/$/, '');
    this.modelId = process.env.SEEDANCE_MODEL_ID || 'doubao-seedance-1-5-pro-251215';
    this.modelVersion = process.env.SEEDANCE_MODEL_VERSION === '2.0' ? '2.0' : '1.5';
  }

  getCapabilities(): VideoModelCapabilities {
    const is20 = this.modelVersion === '2.0';
    return {
      supportsFirstFrame: true,
      supportsLastFrame: is20,
      supportsReferenceImages: is20,
      supportsReferenceVideo: is20,
      maxDurationSeconds: is20 ? 15 : 12,
    };
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
    const content: Array<Record<string, unknown>> = [];

    // First_frame selection priority:
    // 1. User confirmed isPrimary=true
    // 2. AI recommended product_primary role
    // 3. First valid OSS publicUrl
    // 4. Base64 debug fallback
    // 5. Pure prompt (no image)
    const selectedImage = this.selectFirstFrameImage(input);
    if (selectedImage) {
      const publicUrl = selectedImage.publicUrl?.trim();
      let added = false;

      if (publicUrl && this.isPublicHttpUrl(publicUrl)) {
        content.push({
          type: 'image_url',
          image_url: { url: publicUrl },
          role: 'first_frame',
        });
        added = true;
        console.info(`[Seedance] first_frame: using OSS publicUrl from material ${selectedImage.id} (role=${selectedImage.role ?? 'none'}, isPrimary=${selectedImage.isPrimary ?? false})`);
      } else if (process.env.SEEDANCE_ALLOW_BASE64_DEBUG === 'true') {
        const base64 = this.readImageBase64(selectedImage.fileUrl);
        if (base64) {
          content.push({
            type: 'image_url',
            image_url: { url: base64 },
            role: 'first_frame',
          });
          added = true;
          console.info(`[Seedance] first_frame: using base64 debug fallback from material ${selectedImage.id}`);
        }
      } else if (publicUrl) {
        console.warn(`[Seedance] material ${selectedImage.id} publicUrl is not a valid http(s) URL, skipping first_frame`);
      }

      if (!added) {
        console.info(`[Seedance] first_frame: no valid image source for material ${selectedImage.id}, using pure prompt`);
      }
    } else {
      console.info('[Seedance] first_frame: no image material found, using pure prompt');
    }

    // Add text prompt
    content.push({
      type: 'text',
      text: this.buildPrompt(input),
    });

    return {
      model: this.modelId,
      content,
      resolution: input.resolution === '4k' ? '1080p' : input.resolution || '720p',
      ratio: input.aspectRatio || '9:16',
      duration: this.clampDuration(input.scenes.reduce((sum, scene) => sum + scene.duration, 0)),
      generate_audio: process.env.SEEDANCE_GENERATE_AUDIO === 'true',
      watermark: false,
    };
  }

  private selectFirstFrameImage(input: SeedanceRenderInput): SeedanceRenderInput['materials'][0] | undefined {
    const images = input.materials.filter((m) => m.type === 'image');
    if (images.length === 0) return undefined;

    // Priority 1: User confirmed isPrimary=true
    const primary = images.find((m) => m.isPrimary === true);
    if (primary) return primary;

    // Priority 2: AI recommended product_primary role
    const productPrimary = images.find((m) => m.role === 'product_primary');
    if (productPrimary) return productPrimary;

    // Priority 3: First image with valid OSS publicUrl
    const withPublicUrl = images.find((m) => m.publicUrl && this.isPublicHttpUrl(m.publicUrl));
    if (withPublicUrl) return withPublicUrl;

    // Priority 4: Scene-specific materialId (may lack publicUrl)
    const sceneMaterialId = input.scenes.find((s) => s.materialId)?.materialId;
    if (sceneMaterialId) {
      const sceneImage = images.find((m) => m.id === sceneMaterialId);
      if (sceneImage) return sceneImage;
    }

    // Priority 5: First image (for base64 fallback or pure prompt)
    return images[0];
  }

  private isPublicHttpUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      const hostname = parsed.hostname.toLowerCase();
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
      if (/\/uploads\//i.test(parsed.pathname)) return false;
      if (
        hostname === 'localhost'
        || hostname === '0.0.0.0'
        || hostname === '::1'
        || hostname === '127.0.0.1'
        || hostname.startsWith('10.')
        || hostname.startsWith('192.168.')
        || /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
      ) {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  private readImageBase64(fileUrl: string): string | null {
    try {
      if (!/^\/uploads\/[^/\\]+$/.test(fileUrl)) {
        console.warn('[Seedance] Ignore unsafe local material URL');
        return null;
      }

      const uploadDir = path.resolve(process.env.UPLOAD_DIR || './uploads');
      const fileName = path.basename(fileUrl);
      const filePath = path.resolve(uploadDir, fileName);
      if (!filePath.startsWith(`${uploadDir}${path.sep}`)) {
        console.warn('[Seedance] Ignore local material path outside upload directory');
        return null;
      }

      if (!fs.existsSync(filePath)) {
        return null;
      }

      const stats = fs.statSync(filePath);
      const maxSize = 10 * 1024 * 1024; // 10MB limit
      if (stats.size > maxSize) {
        console.warn(`[Seedance] 图片 ${fileName} 超过 10MB 限制，跳过`);
        return null;
      }

      const ext = path.extname(fileName).toLowerCase();
      const mimeMap: Record<string, string> = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.gif': 'image/gif',
      };
      const mime = mimeMap[ext] || 'image/jpeg';

      const buffer = fs.readFileSync(filePath);
      return `data:${mime};base64,${buffer.toString('base64')}`;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[Seedance] 读取图片 base64 失败: ${message}`);
      return null;
    }
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

    // 素材信息段
    const materialLines = input.materials.map(m => {
      const type = m.type === 'video' ? '视频素材' : '图片素材';
      const desc = m.aiDescription || m.title;
      const tags = m.tags.length > 0 ? `标签：${m.tags.join(',')}` : '';
      return `- ${type}：${desc}${tags ? `，${tags}` : ''}`;
    });
    const materialSection = materialLines.length > 0
      ? `【可用素材】\n${materialLines.join('\n')}`
      : '';

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

    const sections = [productSection, materialSection, visualSection, sceneSection, requirements].filter(Boolean);
    return sections.join('\n\n');
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
