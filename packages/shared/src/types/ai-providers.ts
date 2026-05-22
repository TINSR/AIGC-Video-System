import type { Product, Material, CreativePlan, Scene, VisualBible } from './index';

// CreativePlan草稿类型：不含 id/createdAt/status，且分镜使用 SceneDraft
export type SceneDraft = Omit<Scene, 'id' | 'creativePlanId'>;

export type CreativePlanDraft = Omit<CreativePlan, 'id' | 'createdAt' | 'status' | 'scenes'> & {
  scenes: SceneDraft[];
};

// AiProvider 统一接口
export interface AiProvider {
  generateScript(input: ScriptInput): Promise<CreativePlanDraft>;
  regenerateScene(input: SceneRegenerateInput): Promise<SceneDraft>;
}

// MockAiProvider 输入类型
export interface ScriptInput {
  product: Product;
  materials: Material[];
  style?: "pain_point" | "review" | "scenario" | "discount" | "premium";
  maxDuration?: number;
}

export interface SceneRegenerateInput {
  product: Product;
  materials: Material[];
  existingScene: Scene;
  creativePlan: CreativePlan;
  modifyRequest?: string;
}

// Seedance 1.5 Provider 接口
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
  clips?: {
    sceneId: string;
    videoUrl: string;
    duration: number;
  }[];
  errorMessage?: string;
}

export type SeedanceTaskStatus = Omit<SeedanceRenderOutput, 'clips'>;

// FFmpeg 合成Provider 接口
export interface FFmpegComposeProvider {
  compose(input: FinalComposeInput): Promise<FinalComposeOutput>;
  generateFromPlan(input: GenerateFromPlanInput): Promise<FinalComposeOutput>;
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

// 视频生成Provider 通用响应
export type VideoProviderResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
};
