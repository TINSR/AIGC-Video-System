import type { Scene, MaterialClip, SmartEditDecision } from '@shared/types';
import type { ClipProfile } from './types';
import { SMART_EDIT_BEAM_WIDTH, SMART_EDIT_TOP_CANDIDATES_PER_SCENE } from './smartEditAlgorithmConfig';

type BeamState = {
  decisions: SmartEditDecision[];
  score: number;
  usage: Map<string, number>;
  lastClipId?: string;
  lastMaterialId?: string;
  lastShotType?: string;
  lastSceneType?: string;
};

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function clamp100(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

function goalMatchScore(scene: Scene, profile: ClipProfile): number {
  if (!scene.goal) return 0.4;
  if (profile.suitableGoals.includes(scene.goal as 'hook' | 'feature' | 'proof' | 'cta' | 'full_demo')) {
    return 1;
  }
  const goalToSceneType: Record<string, string[]> = {
    hook: ['usage_scene', 'lifestyle'],
    feature: ['product_closeup', 'detail'],
    proof: ['detail', 'usage_scene', 'packaging'],
    cta: ['product_closeup', 'cta', 'packaging'],
    full_demo: ['product_closeup', 'usage_scene'],
  };
  if (goalToSceneType[scene.goal]?.includes(profile.sceneType)) {
    return 0.6;
  }
  return 0.2;
}

function semanticMatchScore(scene: Scene, profile: ClipProfile, clip: MaterialClip): number {
  const sceneText = [scene.subtitle, scene.voiceover, scene.visualDescription]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (!sceneText.trim()) return 0.3;

  const clipTerms = [
    ...clip.tags,
    ...profile.actions,
    ...profile.objects,
    ...profile.sellingPoints,
    profile.sceneType,
  ]
    .map((s) => s.toLowerCase().trim())
    .filter((s) => s.length >= 2);

  const hits = clipTerms.filter((term) => sceneText.includes(term));
  if (hits.length >= 3) return 1;
  if (hits.length >= 2) return 0.8;
  if (hits.length === 1) return 0.5;
  return 0.2;
}

function sellingPointMatchScore(scene: Scene, profile: ClipProfile): number {
  if (profile.sellingPoints.length === 0) return 0.3;

  const sceneText = [scene.subtitle, scene.voiceover, scene.visualDescription]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const hits = profile.sellingPoints.filter((sp) =>
    sp.split(/[,，、\s]+/).some((word) => word.length >= 2 && sceneText.includes(word.toLowerCase())),
  );

  if (hits.length >= 2) return 1;
  if (hits.length === 1) return 0.7;
  return 0.3;
}

function durationFitScore(sceneDuration: number, clipDuration: number): number {
  const diff = Math.abs(clipDuration - sceneDuration);
  if (diff <= 0.5) return 1;
  if (diff <= 1) return 0.85;
  if (diff <= 2) return 0.6;
  return 0.3;
}

function shotTypeFitScore(scene: Scene, profile: ClipProfile): number {
  if (!scene.goal) return 0.5;

  switch (scene.goal) {
    case 'hook':
      return (profile.shotType === 'medium' || profile.shotType === 'wide') ? 1 : 0.4;
    case 'feature':
      return (profile.shotType === 'close_up' || profile.shotType === 'extreme_close_up') ? 1 : 0.5;
    case 'proof':
      return (profile.shotType === 'close_up' || profile.shotType === 'medium') ? 1 : 0.5;
    case 'cta':
      return (profile.shotType === 'close_up' || profile.shotType === 'medium') ? 1 : 0.6;
    default:
      return 0.5;
  }
}

function motionFitScore(scene: Scene, profile: ClipProfile): number {
  if (!scene.goal) return 0.5;

  switch (scene.goal) {
    case 'hook':
      return profile.motionIntensity >= 0.4 ? 1 : 0.4;
    case 'feature':
      return profile.motionIntensity <= 0.6 ? 1 : 0.5;
    case 'cta':
      return profile.motionIntensity <= 0.4 ? 1 : 0.4;
    default:
      return 0.5;
  }
}

function computeBaseScore(scene: Scene, clip: MaterialClip, profile: ClipProfile): number {
  const goal = goalMatchScore(scene, profile);
  const semantic = semanticMatchScore(scene, profile, clip);
  const sp = sellingPointMatchScore(scene, profile);
  const vis = profile.productVisibility;
  const quality = profile.visualQuality;
  const duration = durationFitScore(scene.duration, clip.duration);
  const shot = shotTypeFitScore(scene, profile);
  const motion = motionFitScore(scene, profile);

  return clamp100(
    goal * 20 +
    semantic * 20 +
    sp * 20 +
    vis * 15 +
    quality * 10 +
    duration * 5 +
    shot * 5 +
    motion * 5,
  );
}

function computeTransitionScore(
  prev: BeamState,
  clip: MaterialClip,
  profile: ClipProfile,
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  if (!prev.lastClipId) return { score: 0, reasons: [] };

  // Shot type change reward
  if (prev.lastShotType && prev.lastShotType !== profile.shotType && profile.shotType !== 'unknown') {
    score += 4;
    reasons.push('与上一镜头景别不同，画面节奏更自然');
  }

  // Natural content transition
  if (prev.lastSceneType && prev.lastSceneType !== profile.sceneType) {
    score += 3;
    reasons.push('画面类型自然过渡');
  }

  // Consecutive same clip penalty
  if (prev.lastClipId === clip.id) {
    score -= 30;
  }

  // Consecutive same material with similar scene type
  if (prev.lastMaterialId === clip.materialId && prev.lastSceneType === profile.sceneType) {
    score -= 12;
  }

  // Consecutive same shot type
  if (prev.lastShotType && prev.lastShotType === profile.shotType && profile.shotType !== 'unknown') {
    score -= 6;
  }

  // Hook: avoid low motion static images
  if (profile.suitableGoals.includes('hook') && profile.motionIntensity < 0.2 && profile.shotType !== 'unknown') {
    // Only penalize if this clip is being placed in a hook position
    // We can't easily determine that here, so we skip this penalty in transition
  }

  return { score, reasons };
}

function computeReusePenalty(
  usage: Map<string, number>,
  clip: MaterialClip,
  scene: Scene,
  profile: ClipProfile,
): { score: number; reasons: string[] } {
  const count = usage.get(clip.id) || 0;
  let score = 0;
  const reasons: string[] = [];

  if (count > 0) {
    score -= 15 * count;
    reasons.push('素材数量不足，复用已选片段');
  }

  // CTA: prefer high product visibility
  if (scene.goal === 'cta' && profile.productVisibility < 0.6) {
    score -= 15;
  }

  // CTA: prefer static/stable
  if (scene.goal === 'cta' && profile.motionIntensity > 0.7) {
    score -= 10;
  }

  // Low quality warnings
  const warningCount = profile.warnings.filter((w) =>
    ['模糊', '遮挡', '黑帧', '看不清'].some((kw) => w.includes(kw)),
  ).length;
  score -= warningCount * 5;

  // Low start/end quality
  if (profile.startQuality < 0.4 || profile.endQuality < 0.4) {
    score -= 5;
  }

  return { score, reasons };
}

function buildReasons(
  scene: Scene,
  profile: ClipProfile,
  clip: MaterialClip,
  transitionReasons: string[],
  reuseReasons: string[],
): string[] {
  const reasons: string[] = [];

  if (scene.goal && profile.suitableGoals.includes(scene.goal as 'hook' | 'feature' | 'proof' | 'cta' | 'full_demo')) {
    reasons.push(`命中分镜目标 ${scene.goal}`);
  }

  if (profile.sceneType === 'product_closeup') {
    reasons.push('画面中商品主体清晰，适合产品展示');
  }

  if (profile.sellingPoints.length > 0) {
    reasons.push(`匹配卖点：${profile.sellingPoints.slice(0, 2).join('、')}`);
  }

  if (profile.actions.length > 0 && !profile.actions.includes('静态展示')) {
    reasons.push(`片段包含${profile.actions[0]}动作`);
  }

  reasons.push(...transitionReasons.filter((r) => !reasons.includes(r)));
  reasons.push(...reuseReasons.filter((r) => !reasons.includes(r)));

  if (reasons.length === 0) {
    reasons.push('素材片段适用于当前分镜');
  }

  return reasons.slice(0, 4);
}

export class GlobalSceneClipOptimizer {
  optimize(
    scenes: Scene[],
    clips: MaterialClip[],
    profiles: Map<string, ClipProfile>,
  ): SmartEditDecision[] {
    if (clips.length === 0 || scenes.length === 0) {
      return scenes.map((scene) => ({
        sceneId: scene.id,
        sceneOrder: scene.order,
        sceneGoal: scene.goal ?? null,
        sceneSubtitle: scene.subtitle,
        sceneDuration: scene.duration,
        clip: undefined,
        score: 0,
        reasons: ['无可用素材片段'],
        fallbackUsed: true,
      }));
    }

    const orderedScenes = [...scenes].sort((a, b) => a.order - b.order);

    const fallbackClip =
      clips.find((c) => {
        const p = profiles.get(c.id);
        return p?.sceneType === 'product_closeup' && c.type === 'image';
      }) ?? clips.find((c) => c.type === 'image') ?? clips[0];

    let beams: BeamState[] = [{ decisions: [], score: 0, usage: new Map() }];

    for (const scene of orderedScenes) {
      const scoredCandidates: Array<{
        clip: MaterialClip;
        profile: ClipProfile;
        baseScore: number;
      }> = [];

      for (const clip of clips) {
        const profile = profiles.get(clip.id);
        if (!profile) continue;

        const baseScore = computeBaseScore(scene, clip, profile);
        scoredCandidates.push({ clip, profile, baseScore });
      }

      scoredCandidates.sort((a, b) => b.baseScore - a.baseScore);
      const topCandidates = scoredCandidates.slice(0, SMART_EDIT_TOP_CANDIDATES_PER_SCENE);

      const expanded: BeamState[] = [];

      for (const beam of beams) {
        const candidates = topCandidates.length > 0 ? topCandidates : [{ clip: fallbackClip, profile: profiles.get(fallbackClip.id)!, baseScore: 20 }];

        for (const { clip, profile, baseScore } of candidates) {
          const transition = computeTransitionScore(beam, clip, profile);
          const reuse = computeReusePenalty(beam.usage, clip, scene, profile);

          const totalScore = beam.score + baseScore + transition.score + reuse.score;

          const reasons = buildReasons(scene, profile, clip, transition.reasons, reuse.reasons);

          const newUsage = new Map(beam.usage);
          newUsage.set(clip.id, (newUsage.get(clip.id) || 0) + 1);

          const decision: SmartEditDecision = {
            sceneId: scene.id,
            sceneOrder: scene.order,
            sceneGoal: scene.goal ?? null,
            sceneSubtitle: scene.subtitle,
            sceneDuration: scene.duration,
            clip,
            score: clamp100(baseScore),
            reasons,
            fallbackUsed: false,
          };

          expanded.push({
            decisions: [...beam.decisions, decision],
            score: totalScore,
            usage: newUsage,
            lastClipId: clip.id,
            lastMaterialId: clip.materialId,
            lastShotType: profile.shotType,
            lastSceneType: profile.sceneType,
          });
        }
      }

      expanded.sort((a, b) => b.score - a.score);
      beams = expanded.slice(0, SMART_EDIT_BEAM_WIDTH);
    }

    if (beams.length === 0) {
      return orderedScenes.map((scene) => ({
        sceneId: scene.id,
        sceneOrder: scene.order,
        sceneGoal: scene.goal ?? null,
        sceneSubtitle: scene.subtitle,
        sceneDuration: scene.duration,
        clip: fallbackClip,
        score: 30,
        reasons: ['素材不足，使用商品主图兜底'],
        fallbackUsed: true,
      }));
    }

    const best = beams[0];

    // Ensure all scenes have decisions
    const decisionMap = new Map(best.decisions.map((d) => [d.sceneId, d]));
    return orderedScenes.map((scene) => {
      const existing = decisionMap.get(scene.id);
      if (existing) return existing;

      return {
        sceneId: scene.id,
        sceneOrder: scene.order,
        sceneGoal: scene.goal ?? null,
        sceneSubtitle: scene.subtitle,
        sceneDuration: scene.duration,
        clip: fallbackClip,
        score: 30,
        reasons: ['素材不足，使用商品主图兜底'],
        fallbackUsed: true,
      };
    });
  }
}
