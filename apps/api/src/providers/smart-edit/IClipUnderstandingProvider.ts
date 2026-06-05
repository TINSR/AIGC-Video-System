import type { ClipKeyframes, ClipProfile } from './types';

export type ClipAnalysisInput = {
  clipId: string;
  materialId: string;
  materialTitle: string;
  materialTags: string[];
  materialDescription?: string;
  startTime: number;
  endTime: number;
  duration: number;
  isImage: boolean;
  keyframes: ClipKeyframes | null;
  productName: string;
  productCategory: string;
  productSellingPoints: string[];
};

export interface IClipUnderstandingProvider {
  analyze(input: ClipAnalysisInput): Promise<ClipProfile | null>;
}
