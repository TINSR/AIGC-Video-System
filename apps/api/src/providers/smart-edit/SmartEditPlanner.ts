import type {
  Material,
  Scene,
  MaterialClip,
  SmartEditPlan,
  SmartEditDecision,
} from '@shared/types';
import { MaterialClipAnalyzer } from './MaterialClipAnalyzer';
import { SceneClipMatcher } from './SceneClipMatcher';

export class SmartEditPlanner {
  private clipAnalyzer: MaterialClipAnalyzer;
  private sceneMatcher: SceneClipMatcher;

  constructor() {
    this.clipAnalyzer = new MaterialClipAnalyzer();
    this.sceneMatcher = new SceneClipMatcher();
  }

  /**
   * Analyze materials into clips.
   */
  analyzeClips(materials: Material[]): MaterialClip[] {
    return this.clipAnalyzer.analyze(materials);
  }

  /**
   * Generate a SmartEditPlan by matching scenes to clips.
   */
  generatePlan(
    creativePlanId: string,
    scenes: Scene[],
    clips: MaterialClip[],
  ): SmartEditPlan {
    const decisions = this.sceneMatcher.match(scenes, clips);

    const totalDuration = decisions.reduce((sum, d) => {
      const scene = scenes.find((s) => s.id === d.sceneId);
      return sum + (scene?.duration || 3);
    }, 0);

    return {
      creativePlanId,
      decisions,
      totalDuration,
    };
  }

  /**
   * One-shot: analyze clips and generate plan.
   */
  analyzeAndPlan(
    creativePlanId: string,
    materials: Material[],
    scenes: Scene[],
  ): { clips: MaterialClip[]; plan: SmartEditPlan } {
    const clips = this.analyzeClips(materials);
    const plan = this.generatePlan(creativePlanId, scenes, clips);
    return { clips, plan };
  }
}
