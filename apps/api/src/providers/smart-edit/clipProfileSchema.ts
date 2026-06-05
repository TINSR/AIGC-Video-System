import type { ClipProfile, ClipShotType, ClipCameraMotion } from './types';

const VALID_SCENE_TYPES = new Set([
  'product_closeup',
  'usage_scene',
  'detail',
  'packaging',
  'lifestyle',
  'cta',
]);

const VALID_SHOT_TYPES = new Set<ClipShotType>([
  'extreme_close_up',
  'close_up',
  'medium',
  'wide',
  'unknown',
]);

const VALID_CAMERA_MOTIONS = new Set<ClipCameraMotion>([
  'static',
  'pan',
  'tilt',
  'zoom',
  'tracking',
  'handheld',
  'unknown',
]);

const VALID_GOALS = new Set(['hook', 'feature', 'proof', 'cta', 'full_demo']);

function clamp01(value: unknown): number {
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  if (!isFinite(num)) return 0;
  return Math.max(0, Math.min(1, num));
}

function ensureStringArray(value: unknown, maxLength = 20): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .slice(0, maxLength)
    .map((s) => s.trim().slice(0, 100));
}

export function validateClipProfile(
  raw: Record<string, unknown>,
  knownSellingPoints: string[] = [],
): ClipProfile | null {
  if (!raw || typeof raw !== 'object') return null;

  const sceneType = typeof raw.sceneType === 'string' && VALID_SCENE_TYPES.has(raw.sceneType)
    ? raw.sceneType as ClipProfile['sceneType']
    : 'usage_scene';

  const shotType: ClipShotType =
    typeof raw.shotType === 'string' && VALID_SHOT_TYPES.has(raw.shotType as ClipShotType)
      ? (raw.shotType as ClipShotType)
      : 'unknown';

  const cameraMotion: ClipCameraMotion =
    typeof raw.cameraMotion === 'string' && VALID_CAMERA_MOTIONS.has(raw.cameraMotion as ClipCameraMotion)
      ? (raw.cameraMotion as ClipCameraMotion)
      : 'unknown';

  const goals = ensureStringArray(raw.suitableGoals)
    .filter((g) => VALID_GOALS.has(g)) as ClipProfile['suitableGoals'];

  const sellingPoints = ensureStringArray(raw.sellingPoints)
    .filter((sp) => knownSellingPoints.length === 0 || knownSellingPoints.some((k) => sp.includes(k) || k.includes(sp)));

  const warnings = ensureStringArray(raw.warnings, 10);

  const summary = typeof raw.summary === 'string'
    ? raw.summary.trim().slice(0, 200)
    : '';

  if (!summary) return null;

  return {
    clipId: typeof raw.clipId === 'string' ? raw.clipId : '',
    summary,
    sceneType,
    productVisibility: clamp01(raw.productVisibility),
    visualQuality: clamp01(raw.visualQuality),
    startQuality: clamp01(raw.startQuality),
    endQuality: clamp01(raw.endQuality),
    motionIntensity: clamp01(raw.motionIntensity),
    shotType,
    cameraMotion,
    actions: ensureStringArray(raw.actions, 10),
    sellingPoints,
    objects: ensureStringArray(raw.objects, 15),
    colors: ensureStringArray(raw.colors, 10),
    hasTextOverlay: Boolean(raw.hasTextOverlay),
    hasPerson: Boolean(raw.hasPerson),
    suitableGoals: goals.length > 0 ? goals : ['feature'],
    warnings,
    analysisSource: 'doubao_multimodal',
  };
}
