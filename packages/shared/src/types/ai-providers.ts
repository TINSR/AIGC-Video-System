import type { Product, Material, CreativePlan, Scene, VisualBible, ReferenceVideoAnalysis } from './index';

// CreativePlan草稿类型：不含 id/createdAt/status，且分镜使用 SceneDraft
export type SceneDraft = Omit<Scene, 'id' | 'creativePlanId'>;

export type CreativePlanDraft = Omit<CreativePlan, 'id' | 'createdAt' | 'status' | 'scenes'> & {
  scenes: SceneDraft[];
};

// AiProvider 统一接口
export interface AiProvider {
  generateCreativePlan(input: CreativePlanInput): Promise<CreativePlanDraft>;
  regenerateScene(input: SceneRegenerateInput): Promise<SceneDraft>;
}

// AiProvider 输入类型
export interface CreativePlanInput {
  product: Product;
  materials: Material[];
  style?: "pain_point" | "review" | "scenario" | "discount" | "premium";
  maxDuration?: number;
  referenceVideoId?: string;
  referenceVideoAnalysis?: ReferenceVideoAnalysis;
}

export interface SceneRegenerateInput {
  product: Product;
  materials: Material[];
  existingScene: Scene;
  creativePlan: CreativePlan;
  modifyRequest?: string;
}

// Video model capabilities contract
export type VideoModelCapabilities = {
  supportsFirstFrame: boolean;
  supportsLastFrame: boolean;
  supportsReferenceImages: boolean;
  supportsReferenceVideo: boolean;
  maxDurationSeconds: number;
};

// Seedance 1.5 Provider 接口
export interface Seedance15Provider {
  render(input: SeedanceRenderInput): Promise<SeedanceRenderOutput>;
  getTaskStatus(taskId: string): Promise<SeedanceTaskStatus>;
  getCapabilities(): VideoModelCapabilities;
}

export interface SeedanceRenderInput {
  creativePlanId: string;
  scenes: Scene[];
  materials: Material[];
  visualBible: VisualBible;
  resolution?: '1080p' | '4k';
  aspectRatio?: '9:16' | '16:9' | '1:1';
  // Reserved for Seedance 2.0 multi-frame capabilities
  firstFrameUrl?: string;
  lastFrameUrl?: string;
  referenceImageUrls?: string[];
  referenceVideoUrl?: string;
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

// FFmpeg 合成Provider 接口
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

// 视频生成Provider 通用响应
export type VideoProviderResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
};
