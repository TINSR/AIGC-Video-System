export type CandidateSegment = {
  materialId: string;
  sourceFile: string;
  startTime: number;
  endTime: number;
  duration: number;
  detectionMethod: 'scene_change' | 'fixed_fallback' | 'image';
};

export type ClipKeyframes = {
  startFramePath: string;
  middleFramePath: string;
  endFramePath: string;
};

export type ClipShotType =
  | 'extreme_close_up'
  | 'close_up'
  | 'medium'
  | 'wide'
  | 'unknown';

export type ClipCameraMotion =
  | 'static'
  | 'pan'
  | 'tilt'
  | 'zoom'
  | 'tracking'
  | 'handheld'
  | 'unknown';

export type ClipProfile = {
  clipId: string;
  summary: string;
  sceneType:
    | 'product_closeup'
    | 'usage_scene'
    | 'detail'
    | 'packaging'
    | 'lifestyle'
    | 'cta';
  productVisibility: number;
  visualQuality: number;
  startQuality: number;
  endQuality: number;
  motionIntensity: number;
  shotType: ClipShotType;
  cameraMotion: ClipCameraMotion;
  actions: string[];
  sellingPoints: string[];
  objects: string[];
  colors: string[];
  hasTextOverlay: boolean;
  hasPerson: boolean;
  suitableGoals: Array<'hook' | 'feature' | 'proof' | 'cta' | 'full_demo'>;
  warnings: string[];
  analysisSource: 'doubao_multimodal' | 'rule_fallback';
};
