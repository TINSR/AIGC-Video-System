/** Seedance 2.0 extension contract — Day11 reserves fields; 1.5 uses firstFrameUrl only. */
export type VideoModelCapabilities = {
  supportsFirstFrame: boolean;
  supportsLastFrame: boolean;
  supportsReferenceImages: boolean;
  supportsReferenceVideo: boolean;
  maxDurationSeconds: number;
};

export type VideoRenderInput = {
  prompt: string;
  firstFrameUrl?: string;
  lastFrameUrl?: string;
  referenceImageUrls?: string[];
  referenceVideoUrl?: string;
  resolution?: '1080p' | '4k';
  aspectRatio?: '9:16' | '16:9' | '1:1';
};

export const SEEDANCE_15_CAPABILITIES: VideoModelCapabilities = {
  supportsFirstFrame: true,
  supportsLastFrame: false,
  supportsReferenceImages: false,
  supportsReferenceVideo: false,
  maxDurationSeconds: 12,
};
