import type { IMaterialClipAnalysisProvider } from './IMaterialClipAnalysisProvider';
import type { ISmartEditMatchingProvider } from './ISmartEditMatchingProvider';
import type { IClipUnderstandingProvider } from './IClipUnderstandingProvider';
import { RuleBasedMaterialClipAnalysisProvider } from './RuleBasedMaterialClipAnalysisProvider';
import { RuleBasedSmartEditMatchingProvider } from './RuleBasedSmartEditMatchingProvider';
import { DoubaoClipUnderstandingProvider } from './DoubaoClipUnderstandingProvider';
import { RuleBasedClipUnderstandingProvider } from './RuleBasedClipUnderstandingProvider';

export function createMaterialClipAnalysisProvider(): IMaterialClipAnalysisProvider {
  return new RuleBasedMaterialClipAnalysisProvider();
}

export function createSmartEditMatchingProvider(): ISmartEditMatchingProvider {
  return new RuleBasedSmartEditMatchingProvider();
}

export function createClipUnderstandingProvider(): IClipUnderstandingProvider {
  const doubao = new DoubaoClipUnderstandingProvider();
  if (doubao.isConfigured()) {
    return doubao;
  }
  return new RuleBasedClipUnderstandingProvider();
}
