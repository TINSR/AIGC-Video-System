import type {
  Scene,
  MaterialClip,
  SceneGoal,
  SmartEditDecision,
} from '@shared/types';

function normalizeLower(value: string): string {
  return value.trim().toLowerCase();
}

function computeGoalMatch(scene: Scene, clip: MaterialClip): { score: number; reason?: string } {
  const goal = scene.goal as SceneGoal | undefined;
  if (goal && clip.suitableGoals.includes(goal)) {
    return { score: 1, reason: `命中分镜目标 ${goal}` };
  }

  const goalToSceneType: Record<string, string[]> = {
    hook: ['usage_scene', 'lifestyle'],
    feature: ['product_closeup', 'detail'],
    proof: ['detail', 'usage_scene', 'packaging'],
    cta: ['product_closeup', 'cta', 'packaging'],
    full_demo: ['product_closeup', 'usage_scene'],
  };
  if (goal && goalToSceneType[goal]?.includes(clip.sceneType)) {
    return { score: 0.6, reason: `片段类型 ${clip.sceneType} 适合 ${goal} 分镜` };
  }
  return { score: 0.2 };
}

function computeKeywordMatch(scene: Scene, clip: MaterialClip): { score: number; reason?: string } {
  const sceneText = [scene.subtitle, scene.voiceover, scene.visualDescription]
    .join(' ')
    .toLowerCase();
  const clipKeywords = [...clip.tags, clip.sceneType, clip.summary]
    .map(normalizeLower)
    .filter((keyword) => keyword.length >= 2);

  const matchedKeywords: string[] = [];
  for (const keyword of clipKeywords) {
    if (sceneText.includes(keyword) && !matchedKeywords.includes(keyword)) {
      matchedKeywords.push(keyword);
    }
  }

  if (matchedKeywords.length >= 2) {
    return { score: 1, reason: `命中关键词：${matchedKeywords.slice(0, 3).join('、')}` };
  }
  if (matchedKeywords.length === 1) {
    return { score: 0.6, reason: `命中关键词：${matchedKeywords[0]}` };
  }
  return { score: 0.2 };
}

function computeProductVisibility(clip: MaterialClip): { score: number; reason?: string } {
  if (clip.sceneType === 'product_closeup') {
    return { score: 1, reason: '商品主体清晰' };
  }
  if (clip.type === 'image') {
    return { score: 0.8, reason: '商品图片主体可见' };
  }
  if (clip.sceneType === 'usage_scene') {
    return { score: 0.5 };
  }
  return { score: 0.3 };
}

function computeDurationFit(scene: Scene, clip: MaterialClip): { score: number; reason?: string } {
  const diff = Math.abs(clip.duration - scene.duration);
  if (diff <= 1) return { score: 1, reason: '片段时长适合当前分镜' };
  if (diff <= 2) return { score: 0.7 };
  return { score: 0.4 };
}

function computeScore(
  goalMatch: number,
  keywordMatch: number,
  productVisibility: number,
  visualQuality: number,
  durationFit: number,
): number {
  const raw =
    goalMatch * 0.35 +
    keywordMatch * 0.25 +
    productVisibility * 0.20 +
    visualQuality * 0.15 +
    durationFit * 0.05;
  return Math.round(raw * 100);
}

function findBestClip(
  scene: Scene,
  clips: MaterialClip[],
  usedClipIds: Set<string>,
  isCtaScene: boolean,
  isProofScene: boolean,
  isHookScene: boolean,
): { clip: MaterialClip; score: number; reasons: string[] } | null {
  let bestClip: MaterialClip | null = null;
  let bestScore = -1;
  let bestReasons: string[] = [];

  for (const clip of clips) {
    const goalMatch = computeGoalMatch(scene, clip);
    const keywordMatch = computeKeywordMatch(scene, clip);
    const productVisibility = computeProductVisibility(clip);
    const durationFit = computeDurationFit(scene, clip);
    const score = computeScore(
      goalMatch.score,
      keywordMatch.score,
      productVisibility.score,
      clip.visualQuality,
      durationFit.score,
    );

    let bonus = 0;
    if (isCtaScene && (clip.sceneType === 'product_closeup' || clip.type === 'image')) bonus += 5;
    if (isProofScene && (clip.sceneType === 'detail' || clip.sceneType === 'product_closeup')) bonus += 5;
    if (isHookScene && (clip.sceneType === 'usage_scene' || clip.sceneType === 'lifestyle')) bonus += 5;
    if (usedClipIds.has(clip.id)) bonus -= 10;

    const finalScore = score + bonus;

    if (finalScore > bestScore) {
      bestScore = finalScore;
      bestClip = clip;
      bestReasons = [goalMatch, keywordMatch, productVisibility, durationFit]
        .filter((result) => result.reason)
        .map((result) => result.reason!);
      if (usedClipIds.has(clip.id)) {
        bestReasons.push('素材不足，复用最高匹配片段');
      }
    }
  }

  if (!bestClip) return null;
  return { clip: bestClip, score: Math.max(0, Math.min(100, bestScore)), reasons: bestReasons };
}

function findFallbackClip(clips: MaterialClip[]): MaterialClip | null {
  const primary = clips.find((clip) => clip.sceneType === 'product_closeup' && clip.type === 'image');
  if (primary) return primary;

  const anyImage = clips.find((clip) => clip.type === 'image');
  if (anyImage) return anyImage;

  return clips[0] || null;
}

export class SceneClipMatcher {
  match(scenes: Scene[], clips: MaterialClip[]): SmartEditDecision[] {
    if (clips.length === 0) {
      return scenes.map((scene) => ({
        sceneId: scene.id,
        sceneOrder: scene.order,
        sceneGoal: scene.goal,
        score: 0,
        reasons: ['无可用素材片段'],
        fallbackUsed: true,
      }));
    }

    const usedClipIds = new Set<string>();
    const decisions: SmartEditDecision[] = [];
    const sortedScenes = [...scenes].sort((a, b) => a.order - b.order);

    for (const scene of sortedScenes) {
      const isCtaScene = scene.goal === 'cta';
      const isProofScene = scene.goal === 'proof';
      const isHookScene = scene.goal === 'hook';

      const result = findBestClip(scene, clips, usedClipIds, isCtaScene, isProofScene, isHookScene);

      if (result) {
        usedClipIds.add(result.clip.id);
        decisions.push({
          sceneId: scene.id,
          sceneOrder: scene.order,
          sceneGoal: scene.goal,
          clip: result.clip,
          score: result.score,
          reasons: result.reasons,
          fallbackUsed: false,
        });
      } else {
        const fallback = findFallbackClip(clips);
        decisions.push({
          sceneId: scene.id,
          sceneOrder: scene.order,
          sceneGoal: scene.goal,
          clip: fallback || undefined,
          score: fallback ? 30 : 0,
          reasons: fallback
            ? ['素材不足，使用商品主图兜底']
            : ['无可用素材片段'],
          fallbackUsed: true,
        });
      }
    }

    return decisions;
  }
}
