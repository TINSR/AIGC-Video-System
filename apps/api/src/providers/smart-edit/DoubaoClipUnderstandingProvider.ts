import * as fs from 'fs';
import type { ClipAnalysisInput, IClipUnderstandingProvider } from './IClipUnderstandingProvider';
import type { ClipProfile } from './types';
import { validateClipProfile } from './clipProfileSchema';
import { SMART_EDIT_CLIP_ANALYSIS_TIMEOUT_MS } from './smartEditAlgorithmConfig';

const SYSTEM_PROMPT = `你是电商短视频素材分析 Agent。
只根据给出的关键帧判断画面，不得编造未出现的商品特征。
输出必须符合指定 JSON Schema。
所有评分为 0-1 之间的浮点数。
sellingPoints 只能从已知商品卖点中选择或输出空数组。
看不清时使用 unknown，并写入 warnings。
不要输出任何 Markdown 或代码块标记，只输出纯 JSON。`;

const CLIP_PROFILE_SCHEMA_DESC = `{
  "clipId": "string",
  "summary": "string (50字内中文描述画面内容)",
  "sceneType": "product_closeup | usage_scene | detail | packaging | lifestyle | cta",
  "productVisibility": "number 0-1",
  "visualQuality": "number 0-1",
  "startQuality": "number 0-1 首帧画面质量",
  "endQuality": "number 0-1 尾帧画面质量",
  "motionIntensity": "number 0-1 运动强度",
  "shotType": "extreme_close_up | close_up | medium | wide | unknown",
  "cameraMotion": "static | pan | tilt | zoom | tracking | handheld | unknown",
  "actions": "string[] 画面中的动作",
  "sellingPoints": "string[] 从已知卖点中选择",
  "objects": "string[] 画面中的物体",
  "colors": "string[] 主要颜色",
  "hasTextOverlay": "boolean",
  "hasPerson": "boolean",
  "suitableGoals": "Array<hook | feature | proof | cta | full_demo>",
  "warnings": "string[] 看不清或有问题时说明",
  "analysisSource": "doubao_multimodal"
}`;

function buildUserPrompt(input: ClipAnalysisInput): string {
  const points = input.productSellingPoints.length > 0
    ? input.productSellingPoints.map((p) => `- ${p}`).join('\n')
    : '- (无已知卖点)';

  const frameLabels = input.isImage
    ? '这是一张商品图片。'
    : `片段：${input.startTime.toFixed(1)}s - ${input.endTime.toFixed(1)}s（${input.duration.toFixed(1)}s）
请分析三张按时间顺序排列的关键帧（首帧、中间帧、尾帧），判断动作变化和画面内容。`;

  return `商品：${input.productName}
类目：${input.productCategory}
素材标题：${input.materialTitle}
素材标签：${input.materialTags.join('、')}
已知卖点：
${points}

${frameLabels}

请返回 ClipProfile JSON，schema 如下：
${CLIP_PROFILE_SCHEMA_DESC}`;
}

function readFrameAsBase64(filePath: string): string | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    const buf = fs.readFileSync(filePath);
    if (buf.length === 0) return null;
    return buf.toString('base64');
  } catch {
    return null;
  }
}

function getProviderConfig() {
  const provider = process.env.REAL_LLM_PROVIDER || '';
  const apiKey = process.env.REAL_LLM_API_KEY || '';
  const baseUrl = (process.env.REAL_LLM_BASE_URL || '').replace(/\/$/, '');
  const model = process.env.REAL_LLM_MODEL || '';
  const allowLocalImages = process.env.REAL_LLM_ALLOW_LOCAL_BASE64_IMAGES === 'true';
  const maxLocalImageBytes = parseInt(process.env.REAL_LLM_MAX_LOCAL_IMAGE_BYTES || '10485760', 10);

  return { provider, apiKey, baseUrl, model, allowLocalImages, maxLocalImageBytes };
}

function buildApiUrl(baseUrl: string, provider: string): string {
  if (baseUrl.includes('/chat/completions')) return baseUrl;
  return `${baseUrl}/chat/completions`;
}

function buildImageContent(
  base64: string,
  provider: string,
): { type: string; image_url?: { url: string }; source?: { type: string; media_type: string; data: string } } {
  if (provider === 'anthropic') {
    return {
      type: 'image',
      source: { type: 'base64', media_type: 'image/jpeg', data: base64 },
    };
  }
  return {
    type: 'image_url',
    image_url: { url: `data:image/jpeg;base64,${base64}` },
  };
}

export class DoubaoClipUnderstandingProvider implements IClipUnderstandingProvider {
  private cache = new Map<string, ClipProfile>();

  isConfigured(): boolean {
    const { apiKey, baseUrl, model } = getProviderConfig();
    return apiKey.length > 0 && baseUrl.length > 0 && model.length > 0;
  }

  async analyze(input: ClipAnalysisInput): Promise<ClipProfile | null> {
    if (!this.isConfigured()) return null;

    const cacheKey = `${input.materialId}_${input.startTime}_${input.endTime}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const { provider, apiKey, baseUrl, model, allowLocalImages, maxLocalImageBytes } = getProviderConfig();

    const imageContents: Array<Record<string, unknown>> = [];
    const frameLabels = ['首帧 (15%)', '中间帧 (50%)', '尾帧 (85%)'];

    if (input.keyframes) {
      const frames = [
        input.keyframes.startFramePath,
        input.keyframes.middleFramePath,
        input.keyframes.endFramePath,
      ];

      for (let i = 0; i < frames.length; i++) {
        if (!allowLocalImages) break;

        const filePath = frames[i];
        try {
          if (fs.existsSync(filePath) && fs.statSync(filePath).size <= maxLocalImageBytes) {
            const b64 = readFrameAsBase64(filePath);
            if (b64) {
              imageContents.push({
                type: 'text',
                text: `[${frameLabels[i]}]`,
              });
              imageContents.push(buildImageContent(b64, provider));
            }
          }
        } catch {
          // skip failed frame
        }
      }
    }

    const userContent = [
      ...imageContents,
      { type: 'text', text: buildUserPrompt(input) },
    ];

    const body = {
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
      temperature: 0.1,
      max_tokens: 1024,
    };

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), SMART_EDIT_CLIP_ANALYSIS_TIMEOUT_MS);

      const response = await fetch(buildApiUrl(baseUrl, provider), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        console.warn(`[DoubaoClipUnderstanding] API ${response.status}`);
        return null;
      }

      const data = await response.json() as {
        choices?: Array<{ message?: { content?: string } }>;
      };

      const text = data.choices?.[0]?.message?.content?.trim();
      if (!text) return null;

      let parsed: Record<string, unknown>;
      try {
        const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
        parsed = JSON.parse(cleaned);
      } catch {
        console.warn('[DoubaoClipUnderstanding] Response is not valid JSON');
        return null;
      }

      const profile = validateClipProfile(parsed, input.productSellingPoints);
      if (!profile) {
        console.warn('[DoubaoClipUnderstanding] ClipProfile validation failed');
        return null;
      }

      profile.clipId = input.clipId;
      profile.analysisSource = 'doubao_multimodal';

      this.cache.set(cacheKey, profile);
      return profile;
    } catch (error) {
      console.warn('[DoubaoClipUnderstanding] Failed:', error instanceof Error ? error.message : error);
      return null;
    }
  }
}
