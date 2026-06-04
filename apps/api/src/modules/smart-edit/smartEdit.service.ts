import { randomUUID } from 'crypto';
import prisma from '../../config/prisma';
import { CreativePlanService } from '../creative-plans/creativePlan.service';
import { MaterialClipService } from '../material-clips/materialClip.service';
import { MaterialService } from '../materials/material.service';
import { createSmartEditMatchingProvider } from '../../providers/smart-edit/smartEditProviders';
import { buildMatchReasons, computeMatchScore } from '../../providers/smart-edit/smartEditScoring';
import type { Material, MaterialClip, Scene, SmartEditPlan } from '@shared/types';

const MAX_TOTAL_DURATION = 15;
const MIN_SCENE_DURATION = 1;

type MatchRecord = {
  id: string;
  creativePlanId: string;
  sceneId: string;
  clipId: string;
  score: number;
  reasons: unknown;
  createdAt: Date;
};

type SmartEditOverride = {
  sceneId: string;
  clipId: string;
};

export function compressSceneDurations(scenes: Scene[]): Record<string, number> {
  const ordered = [...scenes].sort((a, b) => a.order - b.order);
  const durations = ordered.map((scene) => Math.max(scene.duration, MIN_SCENE_DURATION));
  let total = durations.reduce((sum, value) => sum + value, 0);

  if (total <= MAX_TOTAL_DURATION) {
    return Object.fromEntries(ordered.map((scene, index) => [scene.id, durations[index]]));
  }

  const compressed = [...durations];
  for (let index = compressed.length - 1; index >= 0 && total > MAX_TOTAL_DURATION; index -= 1) {
    const reducible = compressed[index] - MIN_SCENE_DURATION;
    if (reducible <= 0) {
      continue;
    }
    const need = total - MAX_TOTAL_DURATION;
    const delta = Math.min(reducible, need);
    compressed[index] -= delta;
    total -= delta;
  }

  return Object.fromEntries(ordered.map((scene, index) => [scene.id, compressed[index]]));
}

export class SmartEditService {
  private creativePlanService = new CreativePlanService();
  private materialClipService = new MaterialClipService();
  private materialService = new MaterialService();

  async buildPlan(creativePlanId: string, force = false, overrides: SmartEditOverride[] = []): Promise<SmartEditPlan> {
    const plan = await this.creativePlanService.getCreativePlan(creativePlanId);
    if (!plan || !plan.scenes || plan.scenes.length === 0) {
      throw new Error('CREATIVE_PLAN_NOT_FOUND');
    }

    let clips = await this.materialClipService.listByProductId(plan.productId);
    if (clips.length === 0) {
      clips = await this.materialClipService.analyze(plan.productId, false);
    }
    if (clips.length === 0) {
      throw new Error('NO_MATERIAL_CLIPS');
    }

    const materials = await this.materialService.listByProductId(plan.productId);
    const sceneDurations = compressSceneDurations(plan.scenes);
    const scenesWithDuration = plan.scenes.map((scene) => ({
      ...scene,
      duration: sceneDurations[scene.id] ?? scene.duration,
    }));

    const matcher = createSmartEditMatchingProvider();
    const decisions = matcher.matchScenes({
      scenes: scenesWithDuration,
      clips,
      materials,
    });

    if (force) {
      await prisma.sceneClipMatch.deleteMany({ where: { creativePlanId } });
    } else {
      const existing = await prisma.sceneClipMatch.count({ where: { creativePlanId } });
      if (existing > 0) {
        if (overrides.length > 0) {
          await this.applyOverrides(creativePlanId, plan.scenes, clips, materials, sceneDurations, overrides);
        }
        return this.getPlan(creativePlanId);
      }
    }

    const clipById = new Map(clips.map((clip) => [clip.id, clip]));
    const decisionsWithOverrides = decisions.map((decision) => {
      const override = overrides.find((item) => item.sceneId === decision.sceneId);
      if (!override) {
        return decision;
      }
      const scene = scenesWithDuration.find((item) => item.id === override.sceneId);
      const clip = clipById.get(override.clipId);
      if (!scene || !clip) {
        throw new Error('SMART_EDIT_OVERRIDE_NOT_FOUND');
      }
      return {
        ...decision,
        clip,
        score: computeMatchScore(scene, clip, materials, scene.duration),
        reasons: ['手动选择素材', ...buildMatchReasons(scene, clip, materials, scene.duration)],
        fallbackUsed: false,
      };
    });

    await prisma.sceneClipMatch.createMany({
      data: decisionsWithOverrides.map((decision) => ({
        id: randomUUID(),
        creativePlanId,
        sceneId: decision.sceneId,
        clipId: decision.clip?.id ?? '',
        score: decision.score,
        reasons: decision.reasons,
      })),
    });

    const totalDuration = Object.values(sceneDurations).reduce((sum, value) => sum + value, 0);
    return {
      creativePlanId,
      decisions: decisionsWithOverrides.map((decision) => {
        const scene = plan.scenes.find((item) => item.id === decision.sceneId);
        return {
          ...decision,
          sceneSubtitle: scene?.subtitle,
          sceneDuration: scene ? sceneDurations[scene.id] ?? scene.duration : undefined,
          clip: decision.clip ? clipById.get(decision.clip.id) ?? decision.clip : undefined,
        };
      }),
      totalDuration,
    };
  }

  private async applyOverrides(
    creativePlanId: string,
    scenes: Scene[],
    clips: MaterialClip[],
    materials: Material[],
    sceneDurations: Record<string, number>,
    overrides: SmartEditOverride[]
  ): Promise<void> {
    const sceneById = new Map(scenes.map((scene) => [scene.id, scene]));
    const clipById = new Map(clips.map((clip) => [clip.id, clip]));

    for (const override of overrides) {
      const scene = sceneById.get(override.sceneId);
      const clip = clipById.get(override.clipId);
      if (!scene || !clip) {
        throw new Error('SMART_EDIT_OVERRIDE_NOT_FOUND');
      }

      const sceneDuration = sceneDurations[scene.id] ?? scene.duration;
      const sceneWithDuration = { ...scene, duration: sceneDuration };
      await prisma.sceneClipMatch.deleteMany({
        where: { creativePlanId, sceneId: scene.id },
      });
      await prisma.sceneClipMatch.create({
        data: {
          id: randomUUID(),
          creativePlanId,
          sceneId: scene.id,
          clipId: clip.id,
          score: computeMatchScore(sceneWithDuration, clip, materials, sceneDuration),
          reasons: ['手动选择素材', ...buildMatchReasons(sceneWithDuration, clip, materials, sceneDuration)],
        },
      });
    }
  }

  async getPlan(creativePlanId: string): Promise<SmartEditPlan> {
    const plan = await this.creativePlanService.getCreativePlan(creativePlanId);
    if (!plan) {
      throw new Error('CREATIVE_PLAN_NOT_FOUND');
    }

    const matches = await prisma.sceneClipMatch.findMany({
      where: { creativePlanId },
      orderBy: { createdAt: 'asc' },
    });
    if (matches.length === 0) {
      throw new Error('SMART_EDIT_PLAN_NOT_FOUND');
    }

    const clips = await this.materialClipService.listByProductId(plan.productId);
    const clipById = new Map(clips.map((clip) => [clip.id, clip]));
    const sceneById = new Map(plan.scenes.map((scene) => [scene.id, scene]));
    const sceneDurations = compressSceneDurations(plan.scenes);

    const decisions = matches.map((match: MatchRecord) => {
      const scene = sceneById.get(match.sceneId);
      const clip = clipById.get(match.clipId);
      const reasons = Array.isArray(match.reasons) ? (match.reasons as string[]) : [];
      return {
        sceneId: match.sceneId,
        sceneOrder: scene?.order ?? 0,
        sceneGoal: scene?.goal ?? null,
        sceneSubtitle: scene?.subtitle,
        sceneDuration: scene ? sceneDurations[scene.id] ?? scene.duration : undefined,
        clip,
        score: match.score,
        reasons,
        fallbackUsed: reasons.some((reason) => reason.includes('兜底')),
      };
    });

    decisions.sort((a: { sceneOrder: number }, b: { sceneOrder: number }) => a.sceneOrder - b.sceneOrder);

    return {
      creativePlanId,
      decisions,
      totalDuration: Object.values(sceneDurations).reduce((sum, value) => sum + value, 0),
    };
  }

  getSceneDurationsForPlan(creativePlanId: string, scenes: Scene[]): Record<string, number> {
    return compressSceneDurations(scenes);
  }
}
