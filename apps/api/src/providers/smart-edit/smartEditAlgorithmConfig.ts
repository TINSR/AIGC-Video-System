export const SMART_EDIT_SCENE_THRESHOLD = parseFloat(
  process.env.SMART_EDIT_SCENE_THRESHOLD || '0.30',
);

export const SMART_EDIT_MIN_CLIP_DURATION = parseFloat(
  process.env.SMART_EDIT_MIN_CLIP_DURATION || '1.2',
);

export const SMART_EDIT_TARGET_CLIP_DURATION = parseFloat(
  process.env.SMART_EDIT_TARGET_CLIP_DURATION || '3.0',
);

export const SMART_EDIT_MAX_CLIP_DURATION = parseFloat(
  process.env.SMART_EDIT_MAX_CLIP_DURATION || '5.0',
);

export const SMART_EDIT_MAX_CLIPS_PER_MATERIAL = parseInt(
  process.env.SMART_EDIT_MAX_CLIPS_PER_MATERIAL || '12',
  10,
);

export const SMART_EDIT_KEYFRAME_LONG_EDGE = parseInt(
  process.env.SMART_EDIT_KEYFRAME_LONG_EDGE || '768',
  10,
);

export const SMART_EDIT_KEYFRAME_QUALITY = parseInt(
  process.env.SMART_EDIT_KEYFRAME_QUALITY || '82',
  10,
);

export const SMART_EDIT_TEMP_DIR = process.env.SMART_EDIT_TEMP_DIR || '';

export const SMART_EDIT_CLIP_ANALYSIS_TIMEOUT_MS = parseInt(
  process.env.SMART_EDIT_CLIP_ANALYSIS_TIMEOUT_MS || '30000',
  10,
);

export const SMART_EDIT_CLIP_ANALYSIS_CONCURRENCY = parseInt(
  process.env.SMART_EDIT_CLIP_ANALYSIS_CONCURRENCY || '2',
  10,
);

export const SMART_EDIT_BEAM_WIDTH = parseInt(
  process.env.SMART_EDIT_BEAM_WIDTH || '20',
  10,
);

export const SMART_EDIT_TOP_CANDIDATES_PER_SCENE = parseInt(
  process.env.SMART_EDIT_TOP_CANDIDATES_PER_SCENE || '8',
  10,
);

export const NOISE_BOUNDARY_THRESHOLD = 0.4;
export const FIXED_FALLBACK_DURATION = 3.0;
export const FIXED_FALLBACK_MIN_REMAINING = 1.2;
