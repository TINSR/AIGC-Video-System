import { v4 as uuidv4 } from 'uuid';
import { MockAiProvider } from '../../providers/ai/MockAiProvider';
import { ComplianceAgent } from '../../agents/ComplianceAgent';
import { ContinuityAgent } from '../../agents/ContinuityAgent';
import type { CreativePlanInput, CreativePlanDraft } from '@shared/types/ai-providers';
import type { CreativePlan, Scene, Material, Product } from '@shared/types';

// Day 1 兜底存储（数据库未实现前）
const planStore = new Map<string, CreativePlan>();

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

    // 写入内存存储
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

    // 构建占位 product（数据库未实现前使用 demo fixture）
    const product = this.buildProductStub(creativePlan.productId);

    // 调用MockAiProvider重新生成分镜
    const sceneDraft = await this.mockAiProvider.regenerateScene({
      product,
      materials,
      existingScene,
      creativePlan,
      modifyRequest,
    });

    // 检查新分镜的合规性和连贯性
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
      id: uuidv4(),
      creativePlanId: creativePlan.id,
      warnings: [...complianceWarnings.map(w => w.message), ...continuityWarnings.map(w => w.message)],
    };
  }

  // 获取创意方案详情 — 从内存 Map 查询
  async getCreativePlan(id: string): Promise<CreativePlan | null> {
    return planStore.get(id) ?? null;
  }

  // 更新创意方案 — 支持更新 title, hook, adCopy, cta, visualBible, scenes 等字段
  async updateCreativePlan(id: string, data: Partial<CreativePlan>): Promise<CreativePlan | null> {
    const existing = planStore.get(id);
    if (!existing) return null;

    const allowedFields: (keyof CreativePlan)[] = [
      'title', 'hook', 'adCopy', 'cta', 'visualBible', 'scenes',
      'complianceWarnings', 'continuityWarnings',
    ];

    for (const key of allowedFields) {
      if (key in data) {
        (existing as Record<string, unknown>)[key] = data[key];
      }
    }

    planStore.set(id, existing);
    return existing;
  }

  // 批准创意方案 — 将 status 改为 approved
  async approveCreativePlan(id: string): Promise<CreativePlan | null> {
    const existing = planStore.get(id);
    if (!existing) return null;

    existing.status = 'approved';
    planStore.set(id, existing);
    return existing;
  }

  // 数据库未实现前的占位 product
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
