import type { CreativePlanInput, CreativePlanDraft, SceneDraft } from '@shared/types/ai-providers';
import type { Product, Material, VisualBible, ScriptStyle, AgentTrace, SceneGoal, CreativeStrategy, MaterialUsage, ReferenceVideoAnalysis, InspirationTemplateGenerationContext } from '@shared/types';
import { MockAiProvider } from '../../providers/ai/MockAiProvider';
import { RealLLMProvider } from '../../providers/ai/RealLLMProvider';

// ─── Pipeline Context ────────────────────────────────────────────

interface PipelineContext {
  product: Product;
  materials: Material[];
  style: ScriptStyle | string;
  maxDuration: number;
  sceneCount: number;
  trace: AgentTrace[];
  referenceVideoId?: string;
  referenceVideoAnalysis?: ReferenceVideoAnalysis;
  inspirationTemplate?: InspirationTemplateGenerationContext;
  merchantAdCopy?: string;
}

// ─── Agent Output Types ──────────────────────────────────────────

interface ProductAnalysis {
  category: string;
  targetUsers: string;
  painPoints: string;
  sellingPoints: string[];
  constraints: string[];
  materialSummary: string[];
}

interface PipelineStrategy {
  videoGoal: string;
  targetAudience: string;
  sellingPointOrder: string[];
  emotionalArc: string;
  styleDirection: string;
  sceneCount: number;
}

interface ScriptOutput {
  title: string;
  hook: string;
  adCopy: string;
  cta: string;
  voiceoverStyle: string;
}

interface ScenePlan {
  goal: SceneGoal;
  duration: number;
  visualDescription: string;
  subtitle: string;
  voiceover: string;
  materialId?: string;
  materialUsage: MaterialUsage;
  transition: 'cut' | 'fade' | 'zoom';
}

// ─── Constants ───────────────────────────────────────────────────

const SCENE_GOALS_4: SceneGoal[] = ['hook', 'feature', 'proof', 'cta'];
const SCENE_GOALS_3: SceneGoal[] = ['hook', 'feature', 'cta'];
const SCENE_GOALS_2: SceneGoal[] = ['hook', 'cta'];
const SCENE_GOALS_1: SceneGoal[] = ['full_demo'];

function getSceneGoals(count: number): SceneGoal[] {
  if (count <= 1) return SCENE_GOALS_1;
  if (count === 2) return SCENE_GOALS_2;
  if (count === 3) return SCENE_GOALS_3;
  return SCENE_GOALS_4;
}

function now() { return Date.now(); }

function summarizeMaterials(materials: Material[]): string[] {
  return materials.map(m => {
    const type = m.type === 'video' ? '视频' : '图片';
    const desc = m.aiDescription || m.title;
    const tags = m.tags.length > 0 ? `[${m.tags.join(',')}]` : '';
    return `${type}: ${desc} ${tags}`.trim();
  });
}


// ─── Pipeline ────────────────────────────────────────────────────

export class CreativePlanPipeline {
  private mockProvider: MockAiProvider;
  private llmProvider: RealLLMProvider;

  constructor() {
    this.mockProvider = new MockAiProvider();
    this.llmProvider = new RealLLMProvider();
  }

  async generate(input: CreativePlanInput): Promise<CreativePlanDraft & { agentTrace?: AgentTrace[] }> {
    const ctx: PipelineContext = {
      product: input.product,
      materials: input.materials,
      style: input.style || 'scenario',
      maxDuration: input.maxDuration || 15,
      sceneCount: input.referenceVideoAnalysis?.scenes.length
        ? Math.min(Math.max(input.referenceVideoAnalysis.scenes.length, 1), 4)
        : 4,
      trace: [],
      referenceVideoId: input.referenceVideoId,
      referenceVideoAnalysis: input.referenceVideoAnalysis,
    };

    // Merchant ad copy injection
    if (input.merchantAdCopy && input.merchantAdCopy.trim().length > 0) {
      ctx.merchantAdCopy = input.merchantAdCopy.trim();
    }

    // Template inspiration — priority: template > referenceVideo > default
    if (input.inspirationTemplate) {
      ctx.inspirationTemplate = input.inspirationTemplate;
      const tpl = input.inspirationTemplate;
      ctx.trace.push({
        agent: 'TemplateInspiration',
        status: 'success',
        summary: `使用模板"${tpl.name}"，策略：${tpl.strategy}，Hook：${tpl.hookType}，因子：${tpl.factors.slice(0, 4).join('、')}`,
        warnings: tpl.constraints.slice(0, 2),
      });
      if (tpl.style) {
        ctx.style = tpl.style;
      }
    }

    if (input.referenceVideoAnalysis && input.referenceVideoId) {
      ctx.trace.push({
        agent: 'ReferenceVideoInspiration',
        status: 'success',
        summary: `使用参考视频 ${input.referenceVideoId}：${input.referenceVideoAnalysis.hookType} / ${input.referenceVideoAnalysis.style}`,
      });
    }

    // Try Real LLM Provider first if configured
    if (this.llmProvider.isConfigured()) {
      try {
        const start = now();
        const llmDraft = await this.llmProvider.generateCreativePlan(input);
        ctx.trace.push({
          agent: 'RealLLMProvider',
          status: 'success',
          summary: `LLM 生成完成：${llmDraft.scenes.length} 个分镜，标题"${llmDraft.title}"`,
          durationMs: now() - start,
        });

        // Post-process LLM output
        this.seedancePromptAgent(ctx, llmDraft.scenes as SceneDraft[], llmDraft.visualBible);
        this.revisionAgent(llmDraft.scenes as SceneDraft[], ctx);

        return { ...llmDraft, agentTrace: ctx.trace };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        ctx.trace.push({
          agent: 'RealLLMProvider',
          status: 'failed',
          summary: `LLM 调用失败：${message}，fallback 到规则型 Pipeline`,
        });
      }
    }

    // Rule-based pipeline
    try {
      // Stage 1: ProductAnalystAgent
      const analysis = this.productAnalystAgent(ctx);

      // Stage 2: CreativeStrategyAgent
      const strategy = this.creativeStrategyAgent(ctx, analysis);

      // Stage 3: VisualBibleAgent
      const visualBible = this.visualBibleAgent(ctx, analysis);

      // Stage 4: ScriptAgent
      const script = this.scriptAgent(ctx, analysis, strategy);

      // Stage 5: StoryboardAgent
      const scenes = this.storyboardAgent(ctx, strategy, script, visualBible);

      // Stage 6: SeedancePromptAgent — generate prompt for each scene
      this.seedancePromptAgent(ctx, scenes, visualBible);

      // Stage 7: RevisionAgent — one-pass fix
      this.revisionAgent(scenes, ctx);

      // Stage 8: Build output
      const creativeStrategy: CreativeStrategy = {
        videoGoal: strategy.videoGoal,
        targetAudience: strategy.targetAudience,
        sellingPointOrder: strategy.sellingPointOrder,
        emotionalArc: strategy.emotionalArc,
        styleDirection: strategy.styleDirection,
        recommendedSceneCount: strategy.sceneCount,
      };

      const draft: CreativePlanDraft & { agentTrace?: AgentTrace[]; creativeStrategy?: CreativeStrategy } = {
        productId: ctx.product.id,
        style: ctx.style as ScriptStyle,
        title: script.title,
        hook: script.hook,
        adCopy: script.adCopy,
        cta: script.cta,
        visualBible,
        scenes,
        complianceWarnings: [],
        continuityWarnings: [],
        creativeStrategy,
        agentTrace: ctx.trace,
      };

      return draft;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      ctx.trace.push({
        agent: 'Pipeline',
        status: 'failed',
        summary: `Pipeline 失败：${message}，fallback 到 MockAiProvider`,
      });

      // Ultimate fallback
      const draft = await this.mockProvider.generateCreativePlan(input);
      this.injectVisualBibleIntoPrompts(draft, draft.visualBible);
      this.assignSceneGoals(draft);
      this.assignMaterialUsage(draft, input.materials);
      return { ...draft, agentTrace: ctx.trace };
    }
  }

  // ─── Stage 1: ProductAnalystAgent ────────────────────────────

  private productAnalystAgent(ctx: PipelineContext): ProductAnalysis {
    const start = now();
    const { product, materials } = ctx;

    const analysis: ProductAnalysis = {
      category: product.category,
      targetUsers: product.targetAudience,
      painPoints: product.usageScene,
      sellingPoints: product.sellingPoints,
      constraints: ['总时长不超过15秒', '竖屏9:16', '商品始终可见'],
      materialSummary: summarizeMaterials(materials),
    };

    const materialInfo = materials.length > 0
      ? `，${materials.length} 个素材（${materials.filter(m => m.type === 'image').length} 图片/${materials.filter(m => m.type === 'video').length} 视频）`
      : '，无素材';

    ctx.trace.push({
      agent: 'ProductAnalystAgent',
      status: 'success',
      summary: `识别品类"${product.category}"，目标用户"${product.targetAudience}"，核心卖点：${product.sellingPoints.slice(0, 3).join('、')}${materialInfo}`,
      durationMs: now() - start,
    });

    return analysis;
  }

  // ─── Stage 2: CreativeStrategyAgent ──────────────────────────

  private creativeStrategyAgent(ctx: PipelineContext, analysis: ProductAnalysis): PipelineStrategy {
    const start = now();
    const tpl = ctx.inspirationTemplate;
    const ref = ctx.referenceVideoAnalysis;

    // Priority: template > referenceVideo > default
    const sellingPointOrder = tpl && tpl.factors.length > 0
      ? [...tpl.factors.slice(0, analysis.sellingPoints.length), ...analysis.sellingPoints].slice(0, analysis.sellingPoints.length)
      : ref?.sellingPoints.length
        ? [...ref.sellingPoints, ...analysis.sellingPoints].slice(0, analysis.sellingPoints.length)
        : analysis.sellingPoints;

    const goalSequence = tpl && tpl.sceneGoals.length > 0
      ? tpl.sceneGoals
      : ref?.scenes.length
        ? ref.scenes.map((scene) => scene.goal)
        : ['痛点引入', '解决方案', '效果展示', '促单转化'];

    const emotionalArc = goalSequence.join(' -> ');

    const sceneCount = tpl && tpl.sceneGoals.length > 0
      ? Math.min(4, Math.max(2, tpl.sceneGoals.length))
      : ref?.scenes.length
        ? Math.min(4, Math.max(1, ref.scenes.length))
        : Math.min(4, Math.max(1, analysis.sellingPoints.length + 1));

    const strategy: PipelineStrategy = {
      videoGoal: `展示${ctx.product.title}的核心卖点，引导${analysis.targetUsers}购买`,
      targetAudience: analysis.targetUsers,
      sellingPointOrder,
      emotionalArc,
      styleDirection: tpl?.style || ref?.style || ctx.style as string,
      sceneCount,
    };

    const source = tpl ? `模板"${tpl.name}"` : ref ? `参考视频 ${ref.hookType}` : '默认规则';
    ctx.trace.push({
      agent: 'CreativeStrategyAgent',
      status: 'success',
      summary: `策略（${source}）：${emotionalArc}，${sceneCount} 个分镜，卖点顺序：${sellingPointOrder.join(' > ')}`,
      durationMs: now() - start,
    });

    return strategy;
  }

  // ─── Stage 3: VisualBibleAgent ───────────────────────────────

  private visualBibleAgent(ctx: PipelineContext, analysis: ProductAnalysis): VisualBible {
    const start = now();
    const tpl = ctx.inspirationTemplate;

    const baseRules = [
      '每个分镜保持同一商品外观',
      '整体色调保持一致',
      '商品始终清晰可见',
      '禁止改变商品颜色、形状、材质',
    ];
    const templateRules = tpl ? tpl.constraints.filter((c) => !baseRules.includes(c)) : [];
    const continuityRules = [...baseRules, ...templateRules];

    const style = tpl?.style || 'TikTok 快节奏电商广告';

    const visualBible: VisualBible = {
      aspectRatio: '9:16',
      style,
      colorTone: '明亮清爽',
      lighting: '柔和日光',
      cameraStyle: '手持近景 + 商品特写',
      productAppearance: ctx.product.title,
      mainScenes: [analysis.painPoints, '居家使用', '户外场景'],
      continuityRules,
    };

    ctx.trace.push({
      agent: 'VisualBibleAgent',
      status: 'success',
      summary: tpl
        ? `视觉风格已锁定：${visualBible.style}（模板"${tpl.name}"），约束 ${continuityRules.length} 条`
        : `视觉风格已锁定：${visualBible.style}，色调：${visualBible.colorTone}，镜头：${visualBible.cameraStyle}`,
      durationMs: now() - start,
    });

    return visualBible;
  }

  // ─── Stage 4: ScriptAgent ────────────────────────────────────

  private scriptAgent(ctx: PipelineContext, analysis: ProductAnalysis, strategy: PipelineStrategy): ScriptOutput {
    const start = now();
    const { product } = ctx;
    const tpl = ctx.inspirationTemplate;
    const ref = ctx.referenceVideoAnalysis;

    // Hook: priority template > referenceVideo > default
    const hookTemplates: Record<string, string> = {
      '痛点提问': `你是不是还在为${analysis.painPoints}烦恼？`,
      '视觉冲击': `看！${product.title}的神奇效果！`,
      '价格悬念': `没想到${product.title}竟然这么值！`,
      '效果对比': `用${product.title}前后差距也太大了吧！`,
    };
    const hookType = tpl?.hookType || ref?.hookType;
    const hook = hookType && hookTemplates[hookType]
      ? hookTemplates[hookType]
      : ref
        ? `参考灵感（${ref.hookType}）：${ref.summary.slice(0, 60)}`
        : `你是不是还在为${analysis.painPoints}烦恼？`;

    const title = `${product.title} - ${analysis.sellingPoints[0] || ref?.sellingPoints[0] || '品质之选'}`;

    // adCopy: priority merchantAdCopy > template-aware > referenceVideo > default
    const adCopy = ctx.merchantAdCopy
      ? ctx.merchantAdCopy
      : ref
        ? `这款${product.title}，借鉴参考视频结构：${ref.sellingPoints.join('，')}。${analysis.sellingPoints.join('，')}，专为${analysis.targetUsers}设计。`
        : `这款${product.title}，${analysis.sellingPoints.join('，')}，专为${analysis.targetUsers}设计，让你的生活更便捷！`;

    const cta = ref?.ctaType === 'shop_now'
      ? '现在下单享专属优惠，点击下方小黄车带走吧！'
      : '现在下单享专属优惠，点击下方小黄车带走吧！';

    const voiceoverStyle = tpl?.style || ref?.style || '亲切推荐、节奏紧凑';

    const script: ScriptOutput = {
      title,
      hook,
      adCopy,
      cta,
      voiceoverStyle,
    };

    const source = tpl ? `模板"${tpl.name}"` : ref ? `参考 ${ref.hookType}` : '默认';
    const merchantNote = ctx.merchantAdCopy ? '，已注入商家诉求' : '';
    ctx.trace.push({
      agent: 'ScriptAgent',
      status: 'success',
      summary: `标题"${title}"，hook "${hook}"（${source}），CTA "${cta}"${merchantNote}`,
      durationMs: now() - start,
    });

    return script;
  }

  // ─── Stage 5: StoryboardAgent ────────────────────────────────

  private storyboardAgent(
    ctx: PipelineContext,
    strategy: PipelineStrategy,
    script: ScriptOutput,
    visualBible: VisualBible,
  ): SceneDraft[] {
    const start = now();
    const { product, materials } = ctx;
    const ref = ctx.referenceVideoAnalysis;
    const goals = getSceneGoals(strategy.sceneCount);
    const imageMaterials = materials.filter(m => m.type === 'image');
    const videoMaterials = materials.filter(m => m.type === 'video');

    const sceneTemplates = [
      {
        goal: 'hook' as SceneGoal,
        visualDescription: `${strategy.targetAudience}在${product.usageScene}遇到麻烦，表情困扰`,
        subtitle: script.hook.replace('？', '？'),
        voiceover: script.hook,
        transition: 'cut' as const,
        duration: 3,
      },
      {
        goal: 'feature' as SceneGoal,
        visualDescription: `用户使用${product.title}，轻松解决问题，展示核心功能`,
        subtitle: `${product.sellingPoints[0] || '轻松解决'}`,
        voiceover: `直到我发现了这款${product.title}，${product.sellingPoints[0]}，使用起来特别方便`,
        transition: 'fade' as const,
        duration: 4,
      },
      {
        goal: 'proof' as SceneGoal,
        visualDescription: `产品功能细节展示，${product.sellingPoints.slice(1).join('、')}，突出核心卖点`,
        subtitle: `${product.sellingPoints.slice(1).join('，')}`,
        voiceover: `${product.sellingPoints.slice(1).join('，')}，特别适合${strategy.targetAudience}使用`,
        transition: 'fade' as const,
        duration: 4,
      },
      {
        goal: 'cta' as SceneGoal,
        visualDescription: `产品展示，优惠信息，购物引导`,
        subtitle: script.cta.replace('点击下方小黄车带走吧！', '现在下单享专属优惠'),
        voiceover: script.cta,
        transition: 'zoom' as const,
        duration: 4,
      },
    ];

    // Template scene goals take priority
    const tpl = ctx.inspirationTemplate;
    const tplGoals = tpl ? tpl.sceneGoals.map((g) => this.mapReferenceGoalToSceneGoal(g)) : [];

    const scenes: SceneDraft[] = [];
    for (let i = 0; i < strategy.sceneCount; i++) {
      const tmpl = sceneTemplates[i] || sceneTemplates[sceneTemplates.length - 1];
      const materialId = this.pickMaterialForScene(i, imageMaterials, videoMaterials);
      const materialUsage = this.resolveMaterialUsage(materialId, materials);
      const refScene = ref?.scenes[i];

      // Priority: template sceneGoal > referenceVideo goal > pipeline goal > default
      const tplGoal = tplGoals[i];
      const refGoal = refScene?.goal ? this.mapReferenceGoalToSceneGoal(refScene.goal) : undefined;

      scenes.push({
        order: i + 1,
        duration: tmpl.duration,
        visualDescription: refScene?.summary
          ? `${tmpl.visualDescription}（参考结构：${refScene.summary}）`
          : tmpl.visualDescription,
        subtitle: tmpl.subtitle,
        voiceover: tmpl.voiceover,
        seedancePrompt: '', // will be filled by SeedancePromptAgent
        materialId,
        materialUsage,
        goal: tplGoal || refGoal || goals[i] || tmpl.goal,
        warnings: [],
        transition: tmpl.transition,
      });
    }

    const source = tpl ? `模板"${tpl.name}"` : ref ? `参考视频 ${ref.scenes.length} 段结构` : '默认规则';
    ctx.trace.push({
      agent: 'StoryboardAgent',
      status: 'success',
      summary: `生成 ${scenes.length} 个分镜（${source}），结构为 ${scenes.map(s => s.goal).join('-')}`,
      durationMs: now() - start,
    });

    return scenes;
  }

  private mapReferenceGoalToSceneGoal(goal: string): SceneGoal {
    const mapping: Record<string, SceneGoal> = {
      hook: 'hook',
      '开场': 'hook',
      '吸引': 'hook',
      feature: 'feature',
      '功能': 'feature',
      '展示': 'feature',
      proof: 'proof',
      '证明': 'proof',
      '效果': 'proof',
      cta: 'cta',
      '转化': 'cta',
      '促单': 'cta',
      full_demo: 'full_demo',
      '演示': 'full_demo',
    };
    return mapping[goal.toLowerCase().trim()] || 'feature';
  }

  // ─── Stage 6: SeedancePromptAgent ────────────────────────────

  private seedancePromptAgent(ctx: PipelineContext, scenes: SceneDraft[], visualBible: VisualBible): void {
    const start = now();
    const tpl = ctx.inspirationTemplate;

    // Template constraints injected into seedance prompts
    const templateConstraintLine = tpl && tpl.constraints.length > 0
      ? `[模板约束: ${tpl.constraints.join('; ')}]`
      : '';

    for (const scene of scenes) {
      const goalLabel = {
        hook: '开场吸引',
        feature: '功能展示',
        proof: '效果证明',
        cta: '促单转化',
        full_demo: '完整演示',
      }[scene.goal || 'full_demo'];

      const parts = [
        `[商品外观: ${visualBible.productAppearance}]`,
        `[风格: ${visualBible.style}]`,
        `[色调: ${visualBible.colorTone}]`,
        `[镜头: ${visualBible.cameraStyle}]`,
        `[分镜目标: ${goalLabel}]`,
        scene.visualDescription,
        `字幕：${scene.subtitle}`,
        `旁白：${scene.voiceover}`,
        `[连贯规则: ${visualBible.continuityRules.join('; ')}]`,
        '[禁止改变商品颜色、形状、核心卖点]',
      ];

      if (templateConstraintLine) {
        parts.push(templateConstraintLine);
      }

      // Inject material info if available
      if (scene.materialUsage === 'source_clip') {
        parts.push('[素材：使用提供的视频素材作为参考]');
      } else if (scene.materialUsage === 'reference_image') {
        parts.push('[素材：使用提供的图片作为商品外观参考]');
      }

      scene.seedancePrompt = parts.join(' ');
    }

    ctx.trace.push({
      agent: 'SeedancePromptAgent',
      status: 'success',
      summary: `为 ${scenes.length} 个分镜生成 Seedance prompt，均注入 VisualBible 和商品一致性规则`,
      durationMs: now() - start,
    });
  }

  // ─── Stage 7: RevisionAgent ──────────────────────────────────

  private revisionAgent(scenes: SceneDraft[], ctx: PipelineContext): void {
    const start = now();
    const fixes: string[] = [];

    // Fix 1: Ensure total duration <= maxDuration
    let totalDuration = scenes.reduce((s, sc) => s + sc.duration, 0);
    if (totalDuration > ctx.maxDuration) {
      let remainingExcess = totalDuration - ctx.maxDuration;
      const originalDuration = totalDuration;
      // Trim from the last scene first
      for (let i = scenes.length - 1; i >= 0 && remainingExcess > 0; i--) {
        const reducible = Math.min(scenes[i].duration - 1, remainingExcess);
        if (reducible > 0) {
          scenes[i].duration -= reducible;
          totalDuration -= reducible;
          remainingExcess -= reducible;
        }
      }
      fixes.push(`总时长从 ${originalDuration}s 修正为 ${totalDuration}s`);
    }

    // Fix 2: Ensure each scene has a goal
    const goals = getSceneGoals(scenes.length);
    for (let i = 0; i < scenes.length; i++) {
      if (!scenes[i].goal) {
        (scenes[i] as any).goal = goals[i] || 'cta';
        fixes.push(`分镜${i + 1} 补齐 goal`);
      }
    }

    // Fix 3: Ensure each scene has transition
    for (let i = 0; i < scenes.length; i++) {
      if (!scenes[i].transition) {
        (scenes[i] as any).transition = i === 0 ? 'cut' : 'fade';
        fixes.push(`分镜${i + 1} 补齐 transition`);
      }
    }

    // Fix 4: Ensure seedancePrompt is non-empty
    for (let i = 0; i < scenes.length; i++) {
      if (!scenes[i].seedancePrompt || scenes[i].seedancePrompt.trim().length === 0) {
        scenes[i].seedancePrompt = `${scenes[i].visualDescription}，${scenes[i].subtitle}，9:16竖屏`;
        fixes.push(`分镜${i + 1} 补齐 seedancePrompt`);
      }
    }

    ctx.trace.push({
      agent: 'RevisionAgent',
      status: fixes.length > 0 ? 'warning' : 'success',
      summary: fixes.length > 0 ? `修正 ${fixes.length} 项：${fixes.join('；')}` : '无需修正，分镜方案通过',
      durationMs: now() - start,
      warnings: fixes.length > 0 ? fixes : undefined,
    });
  }

  // ─── Helpers ──────────────────────────────────────────────────

  private pickMaterialForScene(
    sceneIndex: number,
    imageMaterials: Material[],
    videoMaterials: Material[],
  ): string | undefined {
    if (sceneIndex === 0 && videoMaterials.length > 0) return videoMaterials[0].id;
    if (sceneIndex === 1 && videoMaterials.length > 1) return videoMaterials[1].id;
    if (imageMaterials.length > sceneIndex) return imageMaterials[sceneIndex].id;
    if (imageMaterials.length > 0) return imageMaterials[0].id;
    if (videoMaterials.length > 0) return videoMaterials[0].id;
    return undefined;
  }

  private resolveMaterialUsage(materialId: string | null | undefined, materials: Material[]): MaterialUsage {
    if (materialId) {
      const mat = materials.find(m => m.id === materialId);
      return mat?.type === 'video' ? 'source_clip' : 'reference_image';
    }
    return materials.length > 0 ? 'reference_image' : 'prompt_only';
  }

  private injectVisualBibleIntoPrompts(draft: CreativePlanDraft, vb: VisualBible): void {
    for (const scene of draft.scenes) {
      const vbPrefix = [
        `[商品外观: ${vb.productAppearance}]`,
        `[风格: ${vb.style}]`,
        `[色调: ${vb.colorTone}]`,
        `[镜头: ${vb.cameraStyle}]`,
        `[连贯规则: ${vb.continuityRules.join('; ')}]`,
      ].join(' ');

      if (!scene.seedancePrompt.includes(vb.productAppearance)) {
        scene.seedancePrompt = `${vbPrefix} ${scene.seedancePrompt}`;
      }
    }
  }

  private assignSceneGoals(draft: CreativePlanDraft): void {
    const goals = getSceneGoals(draft.scenes.length);
    for (let i = 0; i < draft.scenes.length; i++) {
      (draft.scenes[i] as any).goal = goals[i] || 'cta';
    }
  }

  private assignMaterialUsage(draft: CreativePlanDraft, materials: Material[]): void {
    for (const scene of draft.scenes) {
      (scene as any).materialUsage = this.resolveMaterialUsage(scene.materialId, materials);
    }
  }
}
