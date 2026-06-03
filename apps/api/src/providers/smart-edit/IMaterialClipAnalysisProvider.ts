import type { Material } from '@shared/types';
import type { MaterialClipDraft } from '../../modules/material-clips/materialClip.types';

export type MaterialClipSegmentInput = {
  material: Material;
  productId: string;
  startTime?: number;
  endTime?: number;
  duration: number;
};

export interface IMaterialClipAnalysisProvider {
  analyzeSegment(input: MaterialClipSegmentInput): Promise<MaterialClipDraft>;
}
