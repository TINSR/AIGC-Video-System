export type Product = {
  id: string;
  title: string;
  category: string;
  sellingPoints: string[];
  targetAudience: string;
  usageScene: string;
  createdAt: string;
};

export type Material = {
  id: string;
  productId: string;
  type: "image" | "video";
  fileUrl: string;
  thumbnailUrl?: string;
  title: string;
  tags: string[];
  aiDescription?: string;
  duration?: number;
  createdAt: string;
};

export type ScriptStyle =
  | "pain_point"
  | "review"
  | "scenario"
  | "discount"
  | "premium";

export type Scene = {
  id: string;
  creativePlanId: string;
  order: number;
  goal?: "full_demo" | "hook" | "feature" | "proof" | "cta";
  materialUsage?: "reference_image" | "source_clip" | "keyframe_reference" | "prompt_only";
  negativePrompt?: string;
  previewVideoUrl?: string;
  renderStatus?: "idle" | "pending" | "running" | "success" | "failed";
  duration: number;
  visualDescription: string;
  subtitle: string;
  voiceover: string;
  materialId?: string;
  seedancePrompt: string;
  warnings: string[];
  transition: "cut" | "fade" | "zoom";
};

export type AgentTrace = {
  agent: string;
  status: "success" | "warning" | "failed";
  summary: string;
  durationMs?: number;
  warnings?: string[];
};

export type CreativeStrategy = {
  id?: string;
  productId?: string;
  status?: "draft" | "approved" | "rejected";
  videoGoal?: string;
  targetAudience?: string;
  sellingPointOrder?: string[];
  emotionalArc?: string;
  styleDirection?: string;
  recommendedSceneCount?: number;
  warnings?: string[];
  agentTrace?: AgentTrace[];
  createdAt?: string;
  updatedAt?: string;
};

export type VisualBible = {
  aspectRatio: "9:16" | "16:9";
  style: string;
  colorTone: string;
  lighting: string;
  cameraStyle: string;
  productAppearance: string;
  mainScenes: string[];
  continuityRules: string[];
};

export type CreativePlan = {
  id: string;
  productId: string;
  status: "draft" | "approved" | "rendering" | "rendered" | "failed";
  stage?: "strategy_review" | "storyboard_review" | "approved" | "rendering" | "rendered" | "failed";
  renderMode?: "full_video" | "scene_clips";
  creativeStrategy?: CreativeStrategy;
  agentTrace?: AgentTrace[];
  style: ScriptStyle;
  title: string;
  hook: string;
  adCopy: string;
  cta: string;
  visualBible: VisualBible;
  scenes: Scene[];
  complianceWarnings: string[];
  continuityWarnings: string[];
  createdAt: string;
};

export type TaskStatus = "pending" | "running" | "success" | "failed";

export type TaskLog = {
  id: string;
  level: "info" | "warn" | "error";
  message: string;
  timestamp: string;
};

export type GenerationTask = {
  id: string;
  productId: string;
  creativePlanId: string;
  status: TaskStatus;
  progress: number;
  currentStep: string;
  logs: TaskLog[];
  outputVideoUrl?: string;
  provider: "seedance_1_5" | "ffmpeg_fallback";
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
};

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
};

export type AnalyticsOverview = {
  totalPlays: number;
  totalClicks: number;
  conversionRate: number;
  averageWatchRate: number;
  dailyTrend: Array<{
    date: string;
    plays: number;
    clicks: number;
    conversions: number;
  }>;
  abTests: Array<{
    name: string;
    versionA: number;
    versionB: number;
    winner: "A" | "B";
  }>;
};
