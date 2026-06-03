import type { Material, MaterialClip, Scene, SmartEditDecision } from '@shared/types';

export interface ISmartEditMatchingProvider {
  matchScenes(input: {
    scenes: Scene[];
    clips: MaterialClip[];
    materials: Material[];
  }): SmartEditDecision[];
}
