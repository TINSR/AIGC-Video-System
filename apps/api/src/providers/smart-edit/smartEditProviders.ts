import type { IMaterialClipAnalysisProvider } from './IMaterialClipAnalysisProvider';
import type { ISmartEditMatchingProvider } from './ISmartEditMatchingProvider';
import { RuleBasedMaterialClipAnalysisProvider } from './RuleBasedMaterialClipAnalysisProvider';
import { RuleBasedSmartEditMatchingProvider } from './RuleBasedSmartEditMatchingProvider';

export function createMaterialClipAnalysisProvider(): IMaterialClipAnalysisProvider {
  return new RuleBasedMaterialClipAnalysisProvider();
}

export function createSmartEditMatchingProvider(): ISmartEditMatchingProvider {
  return new RuleBasedSmartEditMatchingProvider();
}
