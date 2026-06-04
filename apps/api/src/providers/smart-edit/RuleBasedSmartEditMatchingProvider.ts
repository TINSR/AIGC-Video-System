import type { Material, MaterialClip, Scene, SmartEditDecision } from '@shared/types';
import type { ISmartEditMatchingProvider } from './ISmartEditMatchingProvider';
import { buildMatchReasons, computeMatchScore, preferredSceneTypeBonus } from './smartEditScoring';

export class RuleBasedSmartEditMatchingProvider implements ISmartEditMatchingProvider {
  matchScenes(input: {
    scenes: Scene[];
    clips: MaterialClip[];
    materials: Material[];
  }): SmartEditDecision[] {
    const { scenes, clips, materials } = input;
    const orderedScenes = [...scenes].sort((a, b) => a.order - b.order);
    const usedClipIds = new Set<string>();
    let previousClipId: string | undefined;

    const fallbackClip =
      clips.find((clip) => {
        const material = materials.find((item) => item.id === clip.materialId);
        return material?.isPrimary || material?.role === 'product_primary';
      }) ??
      clips.find((clip) => clip.type === 'image') ??
      clips[0];

    return orderedScenes.map((scene) => {
      const sceneDuration = scene.duration;
      let bestClip: MaterialClip | undefined;
      let bestScore = -1;
      let bestReasons: string[] = [];

      for (const clip of clips) {
        const reusePenalty = usedClipIds.has(clip.id) ? 8 : 0;
        const consecutivePenalty = previousClipId === clip.id ? 12 : 0;
        const score =
          computeMatchScore(scene, clip, materials, sceneDuration) +
          preferredSceneTypeBonus(scene, clip) -
          reusePenalty -
          consecutivePenalty;

        if (score > bestScore) {
          bestScore = score;
          bestClip = clip;
          bestReasons = buildMatchReasons(scene, clip, materials, sceneDuration);
          if (reusePenalty > 0) {
            bestReasons.push('素材数量有限，复用已选片段');
          }
        }
      }

      const fallbackUsed = !bestClip;
      const selected = bestClip ?? fallbackClip;
      if (selected) {
        usedClipIds.add(selected.id);
        previousClipId = selected.id;
      }

      return {
        sceneId: scene.id,
        sceneOrder: scene.order,
        sceneGoal: scene.goal ?? null,
        sceneSubtitle: scene.subtitle,
        sceneDuration,
        clip: selected,
        score: Math.max(0, Math.min(100, bestScore < 0 ? 40 : bestScore)),
        reasons: fallbackUsed
          ? ['未找到高匹配片段，使用商品主图或首张图片兜底', ...(selected ? buildMatchReasons(scene, selected, materials, sceneDuration) : [])]
          : bestReasons,
        fallbackUsed,
      };
    });
  }
}
