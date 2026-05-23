import { v4 as uuidv4 } from 'uuid';
import { MockAiProvider } from '../../providers/ai/MockAiProvider';
import { ComplianceAgent } from '../../agents/ComplianceAgent';
import { ContinuityAgent } from '../../agents/ContinuityAgent';
import { planStore } from '../../memory-store';
import type { CreativePlanInput, CreativePlanDraft } from '@shared/types/ai-providers';
import type { CreativePlan, Scene, Material, Product } from '@shared/types';

const VALID_TRANSITIONS = new Set(['cut', 'fade', 'zoom']);
const VALID_ASPECT_RATIOS = new Set(['9:16', '16:9']);

export class CreativePlanService {
  private mockAiProvider: MockAiProvider;
  private complianceAgent: ComplianceAgent;
  private continuityAgent: ContinuityAgent;

  constructor() {
    this.mockAiProvider = new MockAiProvider();
    this.complianceAgent = new ComplianceAgent();
    this.continuityAgent = new ContinuityAgent();
  }

  // 生成创意方案
  async generateCreativePlan(input: CreativePlanInput): Promise<CreativePlan> {
    const { product, materials } = input;

    // 1. 调用MockAiProvider生成创意方案草稿
    const planDraft = await this.mockAiProvider.generateCreativePlan(input);

    // 2. 调用ComplianceAgent检查合规性
    const { complianceWarnings } = await this.complianceAgent.check(planDraft);

    // 3. 调用ContinuityAgent检查连贯性
    const { continuityWarnings } = await this.continuityAgent.check(planDraft, materials);

    // 4. 组装完整的CreativePlan：补齐 id、status、createdAt、scene.id、scene.creativePlanId
    const planId = uuidv4();
    const now = new Date().toISOString();

    const creativePlan: CreativePlan = {
      id: planId,
      ...planDraft,
      complianceWarnings: complianceWarnings.map(w => w.message),
      continuityWarnings: continuityWarnings.map(w => w.message),
      status: 'draft',
      createdAt: now,
      scenes: planDraft.scenes.map((scene) => ({
        ...scene,
        id: uuidv4(),
        creativePlanId: planId,
      })),
    };

    // 写入共享内存存储
    planStore.set(planId, creativePlan);

    return creativePlan;
  }

  // 重新生成分镜
  async regenerateScene(input: {
    creativePlan: CreativePlan;
    sceneId: string;
    materials: Material[];
    modifyRequest?: string;
  }): Promise<Scene> {
    const { creativePlan, sceneId, materials, modifyRequest } = input;

    const existingScene = creativePlan.scenes.find(s => s.id === sceneId);
    if (!existingScene) {
      throw new Error('分镜不存在');
    }

    const product = this.buildProductStub(creativePlan.productId);

    const sceneDraft = await this.mockAiProvider.regenerateScene({
      product,
      materials,
      existingScene,
      creativePlan,
      modifyRequest,
    });

    const tempPlan: CreativePlanDraft = {
      productId: creativePlan.productId,
      style: creativePlan.style,
      title: creativePlan.title,
      hook: creativePlan.hook,
      adCopy: creativePlan.adCopy,
      cta: creativePlan.cta,
      visualBible: creativePlan.visualBible,
      scenes: [sceneDraft],
      complianceWarnings: [],
      continuityWarnings: [],
    };

    const { complianceWarnings } = await this.complianceAgent.check(tempPlan);
    const { continuityWarnings } = await this.continuityAgent.check(tempPlan, materials);

    return {
      ...sceneDraft,
      id: sceneId, // 保留原 sceneId，前端后续操作不失效
      creativePlanId: creativePlan.id,
      warnings: [...complianceWarnings.map(w => w.message), ...continuityWarnings.map(w => w.message)],
    };
  }

  // 获取创意方案详情
  async getCreativePlan(id: string): Promise<CreativePlan | null> {
    return planStore.get(id) ?? null;
  }

  // 更新创意方案 — 支持字段级更新，含浅层合同校验
  async updateCreativePlan(id: string, data: Partial<CreativePlan>): Promise<CreativePlan | null> {
    const existing = planStore.get(id);
    if (!existing) return null;

    const allowedScalarFields: (keyof CreativePlan)[] = [
      'title', 'hook', 'adCopy', 'cta',
      'complianceWarnings', 'continuityWarnings',
    ];

    for (const key of allowedScalarFields) {
      if (key in data) {
        (existing as Record<string, unknown>)[key] = data[key];
      }
    }

    // visualBible — 浅层合同校验
    if (data.visualBible) {
      const vb = data.visualBible;
      if (!vb.aspectRatio || !VALID_ASPECT_RATIOS.has(vb.aspectRatio)) {
        throw new Error('visualBible.aspectRatio 必须为 9:16 或 16:9');
      }
      if (!vb.style || vb.style.trim().length === 0) {
        throw new Error('visualBible.style 不能为空');
      }
      if (!vb.colorTone || vb.colorTone.trim().length === 0) {
        throw new Error('visualBible.colorTone 不能为空');
      }
      if (!vb.lighting || vb.lighting.trim().length === 0) {
        throw new Error('visualBible.lighting 不能为空');
      }
      if (!vb.cameraStyle || vb.cameraStyle.trim().length === 0) {
        throw new Error('visualBible.cameraStyle 不能为空');
      }
      if (!vb.productAppearance || vb.productAppearance.trim().length === 0) {
        throw new Error('visualBible.productAppearance 不能为空');
      }
      if (!vb.mainScenes || vb.mainScenes.length === 0 || !vb.mainScenes.every((s: string) => s && s.trim().length > 0)) {
        throw new Error('visualBible.mainScenes 不能为空且每个元素必须是非空字符串');
      }
      if (!vb.continuityRules || vb.continuityRules.length === 0 || !vb.continuityRules.every((r: string) => r && r.trim().length > 0)) {
        throw new Error('visualBible.continuityRules 不能为空且每个元素必须是非空字符串');
      }
      existing.visualBible = vb;
    }

    // scenes — 强制校验每个分镜的 Day 1 合同字段
    if (data.scenes) {
      if (!Array.isArray(data.scenes)) {
        throw new Error('scenes 必须是数组');
      }
      const requiredString = ['id', 'creativePlanId', 'visualDescription', 'subtitle', 'voiceover', 'seedancePrompt'] as const;
      for (let i = 0; i < data.scenes.length; i++) {
        const s = data.scenes[i] as Record<string, unknown>;
        const prefix = `scenes[${i}]`;

        for (const field of requiredString) {
          if (typeof s[field] !== 'string' || (s[field] as string).trim().length === 0) {
            throw new Error(`${prefix}.${field} 必须是非空字符串`);
          }
        }
        if (s.creativePlanId !== id) {
          throw new Error(`${prefix}.creativePlanId 必须与方案 id 一致: ${id}`);
        }
        if (typeof s.order !== 'number' || s.order < 1) {
          throw new Error(`${prefix}.order 必须 >= 1，收到: ${s.order}`);
        }
        if (typeof s.duration !== 'number' || s.duration <= 0 || s.duration > 15) {
          throw new Error(`${prefix}.duration 必须在 1-15 秒之间，收到: ${s.duration}`);
        }
        if (typeof s.transition !== 'string' || !VALID_TRANSITIONS.has(s.transition)) {
          throw new Error(`${prefix}.transition 必须是 cut / fade / zoom 之一，收到: ${s.transition}`);
        }
        if (!Array.isArray(s.warnings)) {
          throw new Error(`${prefix}.warnings 必须是数组`);
        }
      }
      existing.scenes = data.scenes;
    }

    planStore.set(id, existing);
    return existing;
  }

  // 批准创意方案
  async approveCreativePlan(id: string): Promise<CreativePlan | null> {
    const existing = planStore.get(id);
    if (!existing) return null;

    existing.status = 'approved';
    planStore.set(id, existing);
    return existing;
  }

  private buildProductStub(productId: string): Product {
    return {
      id: productId,
      title: '演示商品',
      category: '通用',
      sellingPoints: ['品质优良', '性价比高'],
      targetAudience: '大众消费者',
      usageScene: '日常使用',
      createdAt: new Date().toISOString(),
    };
  }
}
