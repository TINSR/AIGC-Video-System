import type { CreativePlanDraft, SceneDraft } from './ai-providers';
import type { Material } from './index';

// 合规警告类型
export interface ComplianceWarning {
  message: string; // 警告内容
  field: string; // 违规字段
  position?: number; // 分镜位置（如果是分镜中的字段）
  suggestion: string; // 修改建议
  forbiddenWord: string; // 匹配到的违规词
}

// 连贯性警告类型
export interface ContinuityWarning {
  message: string; // 警告内容
  type: 'productAppearance' | 'scene' | 'colorTone' | 'duration'; // 警告类型
  sceneId?: string; // 违规分镜ID
  suggestion: string; // 修改建议
}

// ComplianceAgent 接口
export interface IComplianceAgent {
  check(plan: CreativePlanDraft): Promise<{
    complianceWarnings: ComplianceWarning[];
  }>;
}

// ContinuityAgent 接口
export interface IContinuityAgent {
  check(
    plan: CreativePlanDraft,
    materials: Material[]
  ): Promise<{
    continuityWarnings: ContinuityWarning[];
  }>;
}

// 检查结果通用类型
export type AgentCheckResult<T> = {
  warnings: T[];
  passed: boolean;
};
