import type { AiProvider, CreativePlanInput, CreativePlanDraft, SceneRegenerateInput, SceneDraft } from '@shared/types/ai-providers';
import type { Product, Material, ScriptStyle, VisualBible, SceneGoal } from '@shared/types';
import { MockAiProvider } from './MockAiProvider';

interface LLMConfig {
  provider: string;
  apiKey: string;
  baseUrl: string;
  model: string;
}

interface LLMSceneDraft {
  order: number;
  duration: number;
  goal: string;
  visualDescription: string;
  subtitle: string;
  voiceover: string;
  transition: string;
  materialId?: string;
}

interface LLMOutput {
  title: string;
  hook: string;
  adCopy: string;
  cta: string;
  voiceoverStyle?: string;
  visualBible: {
    style: string;
    colorTone: string;
    lighting: string;
    cameraStyle: string;
    productAppearance: string;
    mainScenes: string[];
    continuityRules: string[];
  };
  scenes: LLMSceneDraft[];
}

const VALID_GOALS: SceneGoal[] = ['full_demo', 'hook', 'feature', 'proof', 'cta'];
const VALID_TRANSITIONS = ['cut', 'fade', 'zoom'];

export class RealLLMProvider implements AiProvider {
  private config: LLMConfig | null;
  private fallback: MockAiProvider;

  constructor() {
    const apiKey = process.env.REAL_LLM_API_KEY;
    this.config = apiKey ? {
      provider: process.env.REAL_LLM_PROVIDER || 'openai-compatible',
      apiKey,
      baseUrl: (process.env.REAL_LLM_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, ''),
      model: process.env.REAL_LLM_MODEL || 'gpt-4o-mini',
    } : null;
    this.fallback = new MockAiProvider();
  }

  isConfigured(): boolean {
    return this.config !== null;
  }

  async generateCreativePlan(input: CreativePlanInput): Promise<CreativePlanDraft> {
    if (!this.config) {
      return this.fallback.generateCreativePlan(input);
    }

    try {
      const llmOutput = await this.callLLM(input);
      return this.buildDraft(input, llmOutput);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn('[RealLLMProvider] LLM 调用失败，fallback 到 MockAiProvider:', message);
      return this.fallback.generateCreativePlan(input);
    }
  }

  async regenerateScene(input: SceneRegenerateInput): Promise<SceneDraft> {
    return this.fallback.regenerateScene(input);
  }

  private async callLLM(input: CreativePlanInput): Promise<LLMOutput> {
    const { product, materials, style, maxDuration } = input;

    const systemPrompt = `你是一个 TikTok 电商广告视频创意专家。根据商品信息生成广告方案。
必须返回严格 JSON 格式，不要包含任何其他文本。
JSON schema:
{
  "title": "视频标题",
  "hook": "开场吸引语",
  "adCopy": "广告文案",
  "cta": "行动号召",
  "voiceoverStyle": "旁白风格描述",
  "visualBible": {
    "style": "视觉风格",
    "colorTone": "色调",
    "lighting": "光线",
    "cameraStyle": "镜头风格",
    "productAppearance": "商品外观详细描述",
    "mainScenes": ["场景1", "场景2"],
    "continuityRules": ["规则1", "规则2"]
  },
  "scenes": [
    {
      "order": 1,
      "duration": 3,
      "goal": "hook",
      "visualDescription": "画面描述",
      "subtitle": "字幕",
      "voiceover": "旁白",
      "transition": "cut"
    }
  ]
}
scenes 数量 1-4 个，总时长不超过 ${maxDuration || 15} 秒。
goal 必须是 hook/feature/proof/cta/full_demo 之一。
transition 必须是 cut/fade/zoom 之一。`;

    const materialInfo = materials.length > 0
      ? `\n可用素材：${materials.map(m => `${m.type === 'video' ? '视频' : '图片'}: ${m.aiDescription || m.title} [${m.tags.join(',')}]`).join('；')}`
      : '';

    const userPrompt = `商品信息：
- 名称：${product.title}
- 品类：${product.category}
- 目标用户：${product.targetAudience}
- 核心卖点：${product.sellingPoints.join('、')}
- 使用场景：${product.usageScene}
${materialInfo}
风格偏好：${style || 'scenario'}
最大时长：${maxDuration || 15} 秒`;

    const response = await fetch(`${this.config!.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config!.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config!.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`LLM API ${response.status}: ${text.slice(0, 200)}`);
    }

    const data = await response.json() as Record<string, unknown>;
    const content = this.extractContent(data);
    if (!content) {
      throw new Error('LLM 响应中未找到 content');
    }

    return this.parseAndValidate(content);
  }

  private extractContent(data: Record<string, unknown>): string | undefined {
    const choices = data.choices as Array<Record<string, unknown>> | undefined;
    if (!choices || choices.length === 0) return undefined;
    const message = choices[0].message as Record<string, unknown> | undefined;
    return typeof message?.content === 'string' ? message.content : undefined;
  }

  private parseAndValidate(content: string): LLMOutput {
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error('LLM 输出不是有效 JSON');
    }

    if (!parsed || typeof parsed !== 'object') {
      throw new Error('LLM 输出不是对象');
    }

    const obj = parsed as Record<string, unknown>;

    // Validate required fields
    const requiredStrings = ['title', 'hook', 'adCopy', 'cta'];
    for (const field of requiredStrings) {
      if (typeof obj[field] !== 'string' || (obj[field] as string).trim().length === 0) {
        throw new Error(`LLM 输出缺少必填字段: ${field}`);
      }
    }

    // Validate visualBible
    if (!obj.visualBible || typeof obj.visualBible !== 'object') {
      throw new Error('LLM 输出缺少 visualBible');
    }
    const vb = obj.visualBible as Record<string, unknown>;
    const vbStrings = ['style', 'colorTone', 'lighting', 'cameraStyle', 'productAppearance'];
    for (const field of vbStrings) {
      if (typeof vb[field] !== 'string' || (vb[field] as string).trim().length === 0) {
        throw new Error(`visualBible.${field} 缺失或为空`);
      }
    }
    if (!Array.isArray(vb.mainScenes) || vb.mainScenes.length === 0) {
      throw new Error('visualBible.mainScenes 必须是非空数组');
    }
    if (!Array.isArray(vb.continuityRules) || vb.continuityRules.length === 0) {
      throw new Error('visualBible.continuityRules 必须是非空数组');
    }

    // Validate scenes
    if (!Array.isArray(obj.scenes) || obj.scenes.length === 0) {
      throw new Error('scenes 必须是非空数组');
    }
    if (obj.scenes.length > 4) {
      throw new Error('scenes 不能超过 4 个');
    }

    let totalDuration = 0;
    for (let i = 0; i < obj.scenes.length; i++) {
      const scene = obj.scenes[i] as Record<string, unknown>;
      if (typeof scene.order !== 'number' || scene.order < 1) {
        throw new Error(`scenes[${i}].order 必须 >= 1`);
      }
      if (typeof scene.duration !== 'number' || scene.duration < 1 || scene.duration > 15) {
        throw new Error(`scenes[${i}].duration 必须在 1-15 之间`);
      }
      totalDuration += scene.duration;
      if (!VALID_GOALS.includes(scene.goal as SceneGoal)) {
        throw new Error(`scenes[${i}].goal 无效: ${scene.goal}`);
      }
      if (!VALID_TRANSITIONS.includes(scene.transition as string)) {
        throw new Error(`scenes[${i}].transition 无效: ${scene.transition}`);
      }
      if (typeof scene.visualDescription !== 'string' || scene.visualDescription.trim().length === 0) {
        throw new Error(`scenes[${i}].visualDescription 缺失`);
      }
      if (typeof scene.subtitle !== 'string') {
        throw new Error(`scenes[${i}].subtitle 缺失`);
      }
      if (typeof scene.voiceover !== 'string') {
        throw new Error(`scenes[${i}].voiceover 缺失`);
      }
    }

    if (totalDuration > 15) {
      throw new Error(`scenes 总时长 ${totalDuration} 秒超过 15 秒限制`);
    }

    return obj as unknown as LLMOutput;
  }

  private buildDraft(input: CreativePlanInput, llm: LLMOutput): CreativePlanDraft {
    const imageMaterials = input.materials.filter(m => m.type === 'image');
    const videoMaterials = input.materials.filter(m => m.type === 'video');

    const visualBible: VisualBible = {
      aspectRatio: '9:16',
      style: llm.visualBible.style,
      colorTone: llm.visualBible.colorTone,
      lighting: llm.visualBible.lighting,
      cameraStyle: llm.visualBible.cameraStyle,
      productAppearance: llm.visualBible.productAppearance,
      mainScenes: llm.visualBible.mainScenes,
      continuityRules: llm.visualBible.continuityRules,
    };

    const scenes: SceneDraft[] = llm.scenes.map(s => {
      const materialId = s.materialId || this.pickMaterial(s.order - 1, imageMaterials, videoMaterials);
      const materialUsage = materialId
        ? (input.materials.find(m => m.id === materialId)?.type === 'video' ? 'source_clip' as const : 'reference_image' as const)
        : (input.materials.length > 0 ? 'reference_image' as const : 'prompt_only' as const);

      return {
        order: s.order,
        duration: s.duration,
        goal: s.goal as SceneGoal,
        visualDescription: s.visualDescription,
        subtitle: s.subtitle,
        voiceover: s.voiceover,
        seedancePrompt: '',
        materialId,
        materialUsage,
        warnings: [],
        transition: s.transition as 'cut' | 'fade' | 'zoom',
      };
    });

    return {
      productId: input.product.id,
      style: (input.style || 'scenario') as ScriptStyle,
      title: llm.title,
      hook: llm.hook,
      adCopy: llm.adCopy,
      cta: llm.cta,
      visualBible,
      scenes,
      complianceWarnings: [],
      continuityWarnings: [],
    };
  }

  private pickMaterial(index: number, images: Material[], videos: Material[]): string | undefined {
    if (index === 0 && videos.length > 0) return videos[0].id;
    if (images.length > index) return images[index].id;
    if (images.length > 0) return images[0].id;
    if (videos.length > 0) return videos[0].id;
    return undefined;
  }
}
