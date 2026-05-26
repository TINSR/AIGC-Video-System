import type { Product, Material, CreativePlan, Scene, VisualBible } from '../types';

export type SceneDraft = Omit<Scene, 'id' | 'creativePlanId'>;

export type CreativePlanDraft = Omit<CreativePlan, 'id' | 'createdAt' | 'status' | 'scenes'> & {
  scenes: SceneDraft[];
};

export interface AiProvider {
  generateCreativePlan(input: CreativePlanInput): Promise<CreativePlanDraft>;
  regenerateScene(input: SceneRegenerateInput): Promise<SceneDraft>;
}

export interface CreativePlanInput {
  product: Product;
  materials: Material[];
  style?: 'pain_point' | 'review' | 'scenario' | 'discount' | 'premium';
  maxDuration?: number;
}

export interface SceneRegenerateInput {
  product: Product;
  materials: Material[];
  existingScene: Scene;
  creativePlan: CreativePlan;
  modifyRequest?: string;
}

export interface Seedance15Provider {
  render(input: SeedanceRenderInput): Promise<SeedanceRenderOutput>;
  getTaskStatus(taskId: string): Promise<SeedanceTaskStatus>;
}

export interface SeedanceRenderInput {
  creativePlanId: string;
  scenes: Scene[];
  materials: Material[];
  visualBible: VisualBible;
  resolution?: '1080p' | '4k';
  aspectRatio?: '9:16' | '16:9' | '1:1';
}

export interface SeedanceRenderOutput {
  taskId: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  progress: number;
  videoUrl?: string;
  clips?: {
    sceneId: string;
    videoUrl: string;
    duration: number;
  }[];
  errorMessage?: string;
}

export type SeedanceTaskStatus = Omit<SeedanceRenderOutput, 'clips'>;

export interface FFmpegComposeProvider {
  compose(input: FinalComposeInput): Promise<FinalComposeOutput>;
  generateFromPlan(input: GenerateFromPlanInput): Promise<FinalComposeOutput>;
  checkFFmpegAvailability(): Promise<{ available: boolean; version?: string; error?: string }>;
}

export interface FinalComposeInput {
  clips: {
    url: string;
    duration: number;
    subtitle?: string;
  }[];
  bgmUrl?: string;
  voiceoverUrl?: string;
  outputPath: string;
  resolution?: '1080p' | '4k';
  aspectRatio?: '9:16' | '16:9' | '1:1';
}

export interface GenerateFromPlanInput {
  plan: CreativePlan;
  materials: Material[];
  outputPath: string;
  bgmUrl?: string;
  ttsVoice?: string;
}

export interface FinalComposeOutput {
  success: boolean;
  videoUrl: string;
  duration: number;
  resolution: string;
  fileSize: number;
  errorMessage?: string;
}

export type VideoProviderResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};
