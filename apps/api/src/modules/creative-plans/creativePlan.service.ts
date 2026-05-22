import { v4 as uuidv4 } from 'uuid';
import { MockAiProvider } from '../../providers/ai/MockAiProvider';
import { ComplianceAgent } from '../../agents/ComplianceAgent';
import { ContinuityAgent } from '../../agents/ContinuityAgent';
import type { ScriptInput } from '@shared/types/ai-providers';
import type { CreativePlan } from '@shared/types';

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
  async generateCreativePlan(input: ScriptInput): Promise<CreativePlan> {
    const { product, materials } = input;

    // 1. 调用MockAiProvider生成创意方案草稿
    const planDraft = await this.mockAiProvider.generateScript(input);

    // 2. 调用ComplianceAgent检查合规性
    const { complianceWarnings } = await this.complianceAgent.check(planDraft);

    // 3. 调用ContinuityAgent检查连贯性
    const { continuityWarnings } = await this.continuityAgent.check(planDraft, materials);

    // 4. 组装完整的CreativePlan
    const creativePlan: CreativePlan = {
      id: uuidv4(),
      ...planDraft,
      complianceWarnings: complianceWarnings.map(w => w.message),
      continuityWarnings: continuityWarnings.map(w => w.message),
      status: 'draft',
      createdAt: new Date().toISOString(),
    };

    // 5. 为每个分镜生成ID
    creativePlan.scenes = creativePlan.scenes.map((scene, index) => ({
      ...scene,
      id: uuidv4(),
      creativePlanId: creativePlan.id,
      createdAt: new Date().toISOString(),
    }));

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

    // 调用MockAiProvider重新生成分镜
    const sceneDraft = await this.mockAiProvider.regenerateScene({
      product: { id: creativePlan.productId } as any,
      materials,
      existingScene,
      creativePlan,
      modifyRequest,
    });

    // 检查新分镜的合规性和连贯性
    const tempPlan = {
      ...creativePlan,
      scenes: [sceneDraft],
    };

    const { complianceWarnings } = await this.complianceAgent.check(tempPlan as any);
    const { continuityWarnings } = await this.continuityAgent.check(tempPlan as any, materials);

    return {
      ...sceneDraft,
      id: uuidv4(),
      creativePlanId: creativePlan.id,
      warnings: [...complianceWarnings.map(w => w.message), ...continuityWarnings.map(w => w.message)],
      createdAt: new Date().toISOString(),
    };
  }

  // 获取创意方案详情
  async getCreativePlan(id: string): Promise<CreativePlan | null> {
    // TODO: 实现从数据库查询逻辑
    return null;
  }

  // 更新创意方案
  async updateCreativePlan(id: string, data: Partial<CreativePlan>): Promise<CreativePlan | null> {
    // TODO: 实现数据库更新逻辑
    return null;
  }

  // 批准创意方案
  async approveCreativePlan(id: string): Promise<CreativePlan | null> {
    // TODO: 实现状态更新逻辑
    return null;
  }
}
