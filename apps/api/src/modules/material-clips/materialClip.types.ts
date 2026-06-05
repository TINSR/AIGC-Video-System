import type { MaterialClip } from '@shared/types';

export type MaterialClipDraft = Omit<MaterialClip, 'id' | 'createdAt'>;

export const MAX_VIDEO_CLIPS_PER_MATERIAL = 4;
export const VIDEO_SEGMENT_SECONDS = 4;
export const DEFAULT_IMAGE_CLIP_DURATION = 3;
