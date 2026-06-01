import type { ReferenceVideoAnalysis } from '@shared/types';

export interface IReferenceVideoAnalysisProvider {
  isConfigured(): boolean;
  analyze(playableUrl: string, context: { title: string; category: string }): Promise<ReferenceVideoAnalysis>;
}
