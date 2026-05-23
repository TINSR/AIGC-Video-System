import type { CreativePlanDraft } from './ai-providers';
import type { Material } from '../types';

export interface ComplianceWarning {
  message: string;
  field: string;
  position?: number;
  suggestion: string;
  forbiddenWord: string;
}

export interface ContinuityWarning {
  message: string;
  type: 'productAppearance' | 'scene' | 'colorTone' | 'duration';
  sceneId?: string;
  suggestion: string;
}

export interface IComplianceAgent {
  check(plan: CreativePlanDraft): Promise<{
    complianceWarnings: ComplianceWarning[];
  }>;
}

export interface IContinuityAgent {
  check(
    plan: CreativePlanDraft,
    materials: Material[]
  ): Promise<{
    continuityWarnings: ContinuityWarning[];
  }>;
}

export type AgentCheckResult<T> = {
  warnings: T[];
  passed: boolean;
};
