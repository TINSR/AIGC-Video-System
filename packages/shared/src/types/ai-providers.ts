import type { Product, Material, CreativePlan, Scene, GenerationTask } from './index';

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
  maxDuration?: number; // 总时长限制，默认15秒
}

export interface SceneRegenerateInput {
  product: Product;
  materials: Material[];
  existingScene: Scene;
  creativePlan: CreativePlan;
  modifyRequest?: string;
}

// CreativePlan草稿类型（与最终CreativePlan类型一致，仅缺少id和系统字段）
export type CreativePlanDraft = Omit<CreativePlan, 'id' | 'createdAt' | 'status'>;

export type SceneDraft = Omit<Scene, 'id' | 'creativePlanId' | 'createdAt'>;

// Seedance 1.5 Provider 接口
export interface Seedance15Provider {
  render(input: SeedanceRenderInput): Promise<SeedanceRenderOutput>;
  getTaskStatus(taskId: string): Promise<TaskStatus>;
}

export interface SeedanceRenderInput {
  creativePlanId: string;
  scenes: Scene[];
  materials: Material[];
  visualBible: CreativePlan['visualBible'];
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

export type TaskStatus = Omit<SeedanceRenderOutput, 'clips'>;

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
