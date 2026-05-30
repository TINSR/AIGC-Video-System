import type { CreativePlanInput, CreativePlanDraft, SceneDraft } from '@shared/types/ai-providers';
import type { Product, Material, VisualBible, ScriptStyle, AgentTrace, SceneGoal, CreativeStrategy, MaterialUsage } from '@shared/types';
import { MockAiProvider } from '../../providers/ai/MockAiProvider';

interface PipelineContext {
  product: Product;
  materials: Material[];
  style: ScriptStyle | string;
  maxDuration: number;
  sceneCount: number;
  trace: AgentTrace[];
}

interface ProductAnalysis {
  category: string;
  targetUsers: string;
  painPoints: string;
  sellingPoints: string[];
  constraints: string[];
}

interface PipelineStrategy {
  videoGoal: string;
  targetAudience: string;
  sellingPointOrder: string[];
  emotionalArc: string;
  styleDirection: string;
  sceneCount: number;
}

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

export class CreativePlanPipeline {
  private mockProvider: MockAiProvider;

  constructor() {
    this.mockProvider = new MockAiProvider();
  }

  async generate(input: CreativePlanInput): Promise<CreativePlanDraft & { agentTrace?: AgentTrace[] }> {
    const ctx: PipelineContext = {
      product: input.product,
      materials: input.materials,
      style: input.style || 'scenario',
      maxDuration: input.maxDuration || 15,
      sceneCount: 4,
      trace: [],
    };

    try {
      // Stage 1: Product Analyst
      const analysis = this.analyzeProduct(ctx);

      // Stage 2: Creative Strategy
      const strategy = this.createStrategy(ctx, analysis);

      // Stage 3: Visual Bible
      const visualBible = this.createVisualBible(ctx, analysis);

      // Stage 4+5: Script & Storyboard — delegate to MockAiProvider
      const start = now();
      const draft = await this.mockProvider.generateCreativePlan(input);
      ctx.trace.push({
        agent: 'Script & Storyboard',
        status: 'success',
        summary: `生成 ${draft.scenes.length} 个分镜，总时长 ${draft.scenes.reduce((s, sc) => s + sc.duration, 0)} 秒`,
        durationMs: now() - start,
      });

      // Stage 6: Sync pipeline VisualBible to draft, then inject into prompts
      draft.visualBible = visualBible;
      this.injectVisualBibleIntoPrompts(draft, visualBible);

      // Stage 7: Assign scene goals and materialUsage
      this.assignSceneGoals(draft);
      this.assignMaterialUsage(draft, input.materials);

      // Stage 8: Build CreativeStrategy for output
      const creativeStrategy: CreativeStrategy = {
        videoGoal: strategy.videoGoal,
        targetAudience: strategy.targetAudience,
        sellingPointOrder: strategy.sellingPointOrder,
        emotionalArc: strategy.emotionalArc,
        styleDirection: strategy.styleDirection,
        recommendedSceneCount: strategy.sceneCount,
      };

      // Stage 9: Compliance (reuse existing — run in CreativePlanService)
      ctx.trace.push({
        agent: 'Compliance',
        status: 'success',
        summary: '合规检查将在 CreativePlanService 中执行',
      });

      // Stage 10: Continuity (reuse existing — run in CreativePlanService)
      ctx.trace.push({
        agent: 'Continuity',
        status: 'success',
        summary: '连贯性检查将在 CreativePlanService 中执行',
      });

      return { ...draft, creativeStrategy, agentTrace: ctx.trace };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      ctx.trace.push({
        agent: 'Pipeline',
        status: 'failed',
        summary: `Pipeline 失败：${message}，fallback 到 MockAiProvider`,
      });

      // Fallback to MockAiProvider directly
      const draft = await this.mockProvider.generateCreativePlan(input);
      this.injectVisualBibleIntoPrompts(draft, draft.visualBible);
      this.assignSceneGoals(draft);
      this.assignMaterialUsage(draft, input.materials);
      return { ...draft, agentTrace: ctx.trace };
    }
  }

  // Stage 1: Product Analyst — extract structured info from product
  private analyzeProduct(ctx: PipelineContext): ProductAnalysis {
    const start = now();
    const { product } = ctx;

    const analysis: ProductAnalysis = {
      category: product.category,
      targetUsers: product.targetAudience,
      painPoints: product.usageScene,
      sellingPoints: product.sellingPoints,
      constraints: ['总时长不超过15秒', '竖屏9:16', '商品始终可见'],
    };

    ctx.trace.push({
      agent: 'Product Analyst',
      status: 'success',
      summary: `识别目标用户为${product.targetAudience}，核心卖点：${product.sellingPoints.slice(0, 2).join('、')}`,
      durationMs: now() - start,
    });

    return analysis;
  }

  // Stage 2: Creative Strategy
  private createStrategy(ctx: PipelineContext, analysis: ProductAnalysis): PipelineStrategy {
    const start = now();
    const strategy: PipelineStrategy = {
      videoGoal: `展示${ctx.product.title}的核心卖点，引导用户购买`,
      targetAudience: analysis.targetUsers,
      sellingPointOrder: analysis.sellingPoints,
      emotionalArc: '痛点引入 -> 解决方案 -> 效果展示 -> 促单转化',
      styleDirection: ctx.style as string,
      sceneCount: ctx.sceneCount,
    };

    ctx.trace.push({
      agent: 'Creative Strategy',
      status: 'success',
      summary: `策略：${strategy.emotionalArc}，推荐 ${strategy.sceneCount} 个分镜`,
      durationMs: now() - start,
    });

    return strategy;
  }

  // Stage 3: Visual Bible — ensure consistent visual settings
  private createVisualBible(ctx: PipelineContext, analysis: ProductAnalysis): VisualBible {
    const start = now();

    const visualBible: VisualBible = {
      aspectRatio: '9:16',
      style: 'TikTok 快节奏电商广告',
      colorTone: '明亮清爽',
      lighting: '柔和日光',
      cameraStyle: '手持近景 + 商品特写',
      productAppearance: `${ctx.product.title}`,
      mainScenes: [analysis.painPoints, '居家使用', '户外场景'],
      continuityRules: [
        '每个分镜保持同一商品外观',
        '整体色调保持一致',
        '商品始终清晰可见',
      ],
    };

    ctx.trace.push({
      agent: 'Visual Bible',
      status: 'success',
      summary: `视觉风格已锁定：${visualBible.style}，色调：${visualBible.colorTone}`,
      durationMs: now() - start,
    });

    return visualBible;
  }

  // Stage 6: Inject VisualBible into each scene's seedancePrompt
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

  // Stage 7: Assign scene goals based on scene count
  private assignSceneGoals(draft: CreativePlanDraft): void {
    const goals = getSceneGoals(draft.scenes.length);
    for (let i = 0; i < draft.scenes.length; i++) {
      (draft.scenes[i] as any).goal = goals[i] || 'cta';
    }
  }

  // Assign materialUsage based on material type and scene position
  private assignMaterialUsage(draft: CreativePlanDraft, materials: Material[]): void {
    const hasVideo = materials.some(m => m.type === 'video');
    const hasImage = materials.some(m => m.type === 'image');

    for (const scene of draft.scenes) {
      if (scene.materialId) {
        const mat = materials.find(m => m.id === scene.materialId);
        (scene as any).materialUsage = mat?.type === 'video' ? 'source_clip' : 'reference_image';
      } else if (hasVideo || hasImage) {
        (scene as any).materialUsage = 'reference_image';
      } else {
        (scene as any).materialUsage = 'prompt_only';
      }
    }
  }
}
