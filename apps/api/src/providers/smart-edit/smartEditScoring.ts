import type { ClipSceneType, Material, MaterialClip, Scene, SceneGoal } from '@shared/types';

export function sceneText(scene: Scene): string {
  return [scene.subtitle, scene.voiceover, scene.visualDescription].filter(Boolean).join(' ');
}

export function goalMatchScore(scene: Scene, clip: MaterialClip): number {
  if (scene.goal && clip.suitableGoals.includes(scene.goal)) {
    return 1;
  }
  if (!scene.goal && isSceneTypeSuitableForOrder(clip.sceneType, scene.order)) {
    return 0.6;
  }
  return 0.2;
}

function isSceneTypeSuitableForOrder(sceneType: ClipSceneType, order: number): boolean {
  if (order <= 1) {
    return sceneType === 'lifestyle' || sceneType === 'usage_scene' || sceneType === 'product_closeup';
  }
  if (order >= 4) {
    return sceneType === 'cta' || sceneType === 'product_closeup';
  }
  return sceneType === 'detail' || sceneType === 'product_closeup' || sceneType === 'usage_scene';
}

export function keywordMatchScore(scene: Scene, clip: MaterialClip): number {
  const text = sceneText(scene).toLowerCase();
  if (!text.trim()) {
    return 0.2;
  }

  const keywords = [...clip.tags, ...clip.summary.split(/[\s,，、。]+/)]
    .map((item) => item.trim())
    .filter((item) => item.length >= 2);
  const hits = keywords.filter((keyword) => text.includes(keyword.toLowerCase()));
  if (hits.length >= 2) {
    return 1;
  }
  if (hits.length === 1) {
    return 0.6;
  }
  return 0.2;
}

export function productVisibilityScore(clip: MaterialClip, materials: Material[]): number {
  const material = materials.find((item) => item.id === clip.materialId);
  if (clip.sceneType === 'product_closeup' || material?.role === 'product_primary' || material?.isPrimary) {
    return 1;
  }
  if (clip.type === 'image') {
    return 0.8;
  }
  if (clip.sceneType === 'usage_scene') {
    return 0.5;
  }
  return 0.3;
}

export function durationFitScore(sceneDuration: number, clipDuration: number): number {
  const diff = Math.abs(clipDuration - sceneDuration);
  if (diff <= 1) {
    return 1;
  }
  if (diff <= 2) {
    return 0.7;
  }
  return 0.4;
}

export function preferredSceneTypeBonus(scene: Scene, clip: MaterialClip): number {
  if (scene.goal === 'cta' && (clip.sceneType === 'cta' || clip.sceneType === 'product_closeup' || clip.type === 'image')) {
    return 5;
  }
  if (scene.goal === 'proof' && (clip.sceneType === 'detail' || clip.sceneType === 'product_closeup')) {
    return 5;
  }
  if (scene.goal === 'hook' && (clip.sceneType === 'usage_scene' || clip.sceneType === 'lifestyle')) {
    return 5;
  }
  return 0;
}

export function computeMatchScore(
  scene: Scene,
  clip: MaterialClip,
  materials: Material[],
  sceneDuration: number
): number {
  const goalMatch = goalMatchScore(scene, clip);
  const keywordMatch = keywordMatchScore(scene, clip);
  const productVisibility = productVisibilityScore(clip, materials);
  const visualQuality = clip.visualQuality;
  const durationFit = durationFitScore(sceneDuration, clip.duration);

  const raw =
    goalMatch * 0.35 +
    keywordMatch * 0.25 +
    productVisibility * 0.2 +
    visualQuality * 0.15 +
    durationFit * 0.05;

  return Math.round(raw * 100);
}

export function buildMatchReasons(
  scene: Scene,
  clip: MaterialClip,
  materials: Material[],
  sceneDuration: number
): string[] {
  const reasons: string[] = [];
  if (scene.goal && clip.suitableGoals.includes(scene.goal)) {
    reasons.push(`命中分镜目标 ${scene.goal}`);
  }
  const text = sceneText(scene).toLowerCase();
  const hitTag = clip.tags.find((tag) => text.includes(tag.toLowerCase()));
  if (hitTag) {
    reasons.push(`命中关键词：${hitTag}`);
  }
  const material = materials.find((item) => item.id === clip.materialId);
  if (clip.sceneType === 'product_closeup' || material?.role === 'product_primary' || material?.isPrimary) {
    reasons.push('商品主体清晰');
  }
  if (durationFitScore(sceneDuration, clip.duration) >= 0.7) {
    reasons.push('片段时长适合当前分镜');
  }
  if (preferredSceneTypeBonus(scene, clip) > 0) {
    reasons.push(`符合 ${scene.goal ?? '当前'} 分镜的素材偏好`);
  }
  if (reasons.length === 0) {
    reasons.push('基础匹配：素材片段可用于当前分镜');
  }
  return reasons;
}

export function defaultSuitableGoals(sceneType: ClipSceneType): SceneGoal[] {
  switch (sceneType) {
    case 'product_closeup':
      return ['hook', 'feature', 'proof', 'cta'];
    case 'usage_scene':
    case 'lifestyle':
      return ['hook', 'feature', 'full_demo'];
    case 'detail':
      return ['feature', 'proof'];
    case 'packaging':
      return ['proof', 'feature'];
    case 'cta':
      return ['cta'];
    default:
      return ['feature', 'proof'];
  }
}
