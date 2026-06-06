export {
  SEEDANCE_15_CAPABILITIES,
  type VideoModelCapabilities,
  type VideoRenderInput,
} from './types/video-provider';

export type Product = {
  id: string;
  title: string;
  category: string;
  sellingPoints: string[];
  targetAudience: string;
  usageScene: string;
  createdAt: string;
};

export type MaterialCloudStatus = 'uploaded' | 'local_only' | 'failed';

export type ReferenceVideoSourcePlatform =
  | 'douyin_shop'
  | 'tiktok_shop'
  | 'instagram'
  | 'facebook'
  | 'merchant_upload'
  | 'other';

export type ReferenceVideoSourceType =
  | 'merchant_owned'
  | 'licensed_public'
  | 'public_reference';

export type ReferenceVideoAnalysisStatus = 'pending' | 'running' | 'success' | 'failed';

export type ReferenceVideoAnalysisScene = {
  startTime: string;
  endTime: string;
  goal: string;
  summary: string;
};

export type ReferenceVideoAnalysis = {
  summary: string;
  hookType: string;
  sellingPoints: string[];
  style: string;
  scenes: ReferenceVideoAnalysisScene[];
  ctaType: string;
  keywords: string[];
};

export type ReferenceVideo = {
  id: string;
  title: string;
  sourcePlatform: ReferenceVideoSourcePlatform;
  sourceType: ReferenceVideoSourceType;
  sourceUrl?: string;
  sourceNote?: string;
  category: string;
  keywords: string[];
  fileUrl?: string;
  publicUrl?: string;
  cloudStatus?: MaterialCloudStatus;
  analysisStatus: ReferenceVideoAnalysisStatus;
  analysis?: ReferenceVideoAnalysis;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
};

export type InspirationTemplateSourceMode = 'built_in' | 'rule_generated' | 'manual';
export type InspirationTemplateStatus = 'active' | 'archived';

export type InspirationTemplate = {
  id: string;
  name: string;
  category?: string;
  description: string;
  strategy: string;
  hookType: string;
  style: string;
  factors: string[];
  constraints: string[];
  sceneGoals: string[];
  tags: string[];
  referenceVideoIds: string[];
  sourceMode: InspirationTemplateSourceMode;
  status: InspirationTemplateStatus;
  createdAt: string;
  updatedAt: string;
};

export type InspirationTemplateGenerationContext = Pick<
  InspirationTemplate,
  'id' | 'name' | 'strategy' | 'hookType' | 'style' | 'factors' | 'constraints' | 'sceneGoals'
>;

export type TemplateRecommendationEvidenceType =
  | 'category_match'
  | 'selling_point_match'
  | 'usage_scene_match'
  | 'historical_performance';

export type TemplateRecommendationEvidence = {
  type: TemplateRecommendationEvidenceType;
  label: string;
  detail: string;
};

export type InspirationTemplateRecommendation = {
  template: InspirationTemplate;
  score: number;
  reasons: string[];
  evidence?: TemplateRecommendationEvidence[];
};

export type MaterialRole =
  | 'product_primary'
  | 'product_detail'
  | 'usage_scene'
  | 'packaging'
  | 'other';

export type MaterialRoleAnalysis = {
  materialId: string;
  role: MaterialRole;
  confidence: number;
  reason: string;
};

export type Material = {
  id: string;
  productId: string;
  type: 'image' | 'video';
  fileUrl: string;
  thumbnailUrl?: string;
  title: string;
  tags: string[];
  aiDescription?: string;
  duration?: number;
  role?: MaterialRole;
  roleConfidence?: number;
  roleReason?: string;
  isPrimary?: boolean;
  publicUrl?: string;
  cloudStatus?: MaterialCloudStatus;
  createdAt: string;
};

export type ScriptStyle =
  | 'pain_point'
  | 'review'
  | 'scenario'
  | 'discount'
  | 'premium';

export type SceneGoal = 'full_demo' | 'hook' | 'feature' | 'proof' | 'cta';

export type MaterialUsage =
  | 'reference_image'
  | 'source_clip'
  | 'keyframe_reference'
  | 'prompt_only';

export type MaterialClipSourceType = 'merchant_upload' | 'seedance_generated' | 'system_asset';
export type MaterialClipType = 'image' | 'video_clip';
export type ClipSceneType =
  | 'product_closeup'
  | 'usage_scene'
  | 'detail'
  | 'packaging'
  | 'lifestyle'
  | 'cta';
export type MotionLevel = 'low' | 'medium' | 'high';

export type MaterialClip = {
  id: string;
  productId: string;
  materialId: string;
  sourceType: MaterialClipSourceType;
  type: MaterialClipType;
  fileUrl: string;
  thumbnailUrl?: string;
  startTime?: number;
  endTime?: number;
  duration: number;
  summary: string;
  tags: string[];
  sceneType: ClipSceneType;
  visualQuality: number;
  motionLevel: MotionLevel;
  suitableGoals: SceneGoal[];
  createdAt: string;
};

export type SceneClipMatch = {
  id: string;
  creativePlanId: string;
  sceneId: string;
  clipId: string;
  score: number;
  reasons: string[];
  createdAt: string;
};

export type SmartEditDecision = {
  sceneId: string;
  sceneOrder: number;
  sceneGoal?: SceneGoal | null;
  sceneSubtitle?: string;
  sceneDuration?: number;
  clip?: MaterialClip;
  score: number;
  reasons: string[];
  fallbackUsed: boolean;
};

export type SmartEditPlan = {
  creativePlanId: string;
  decisions: SmartEditDecision[];
  totalDuration: number;
};

export type RenderMode = 'full_video' | 'scene_clips' | 'smart_clip_edit';

export type AgentTrace = {
  agent: string;
  status: 'success' | 'warning' | 'failed';
  summary: string;
  durationMs?: number;
  warnings?: string[];
};

export type CreativeStrategy = {
  id?: string;
  productId?: string;
  status?: 'draft' | 'approved' | 'rejected';
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

export type Scene = {
  id: string;
  creativePlanId: string;
  order: number;
  goal?: SceneGoal | null;
  materialUsage?: MaterialUsage | null;
  negativePrompt?: string | null;
  previewVideoUrl?: string | null;
  renderStatus?: 'idle' | 'pending' | 'running' | 'success' | 'failed' | null;
  duration: number;
  visualDescription: string;
  subtitle: string;
  voiceover: string;
  materialId?: string | null;
  seedancePrompt: string;
  warnings: string[];
  transition: 'cut' | 'fade' | 'zoom';
};

export type VisualBible = {
  aspectRatio: '9:16' | '16:9';
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
  templateId?: string;
  status: 'draft' | 'approved' | 'rendering' | 'rendered' | 'failed';
  stage?: 'strategy_review' | 'storyboard_review' | 'approved' | 'rendering' | 'rendered' | 'failed';
  renderMode?: RenderMode;
  creativeStrategy?: CreativeStrategy;
  agentTrace?: AgentTrace[];
  strategyId?: string;
  version?: number;
  parentPlanId?: string;
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

export type TaskStatus = 'pending' | 'running' | 'success' | 'failed';

export type TaskLog = {
  id: string;
  level: 'info' | 'warn' | 'error';
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
  outputVideoHint?: string;
  provider: 'seedance_1_5' | 'ffmpeg_fallback' | 'smart_clip_edit';
  errorMessage?: string;
  type?: 'creative_strategy' | 'creative_plan' | 'render' | 'scene_render';
  resultId?: string;
  renderMode?: RenderMode;
  renderOptions?: {
    withSubtitle?: boolean;
    withTts?: boolean;
    withBgm?: boolean;
  };
  createdAt: string;
  updatedAt: string;
};

export type WorkspaceNextAction =
  | 'upload_material'
  | 'generate_plan'
  | 'review_plan'
  | 'render_video'
  | 'view_task'
  | 'view_video'
  | 'retry';

export type WorkspaceCreativePlanSummary = Pick<
  CreativePlan,
  'id' | 'productId' | 'status' | 'style' | 'title' | 'hook' | 'createdAt'
> & {
  scenesCount: number;
};

export type WorkspaceMaterialSummary = {
  primaryMaterialId?: string;
  primaryThumbnailUrl?: string;
  primaryPublicUrl?: string;
  primaryCloudStatus?: MaterialCloudStatus;
  uploadedToCloudCount: number;
  localOnlyCount: number;
  cloudFailedCount: number;
};

export type WorkspaceTaskItem = {
  product: Product;
  materialsCount: number;
  creativePlansCount: number;
  materialsSummary?: WorkspaceMaterialSummary;
  latestPlan?: WorkspaceCreativePlanSummary;
  latestTask?: GenerationTask;
  nextAction: WorkspaceNextAction;
};

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
};

export type CommerceMetricsPlatform = 'mock' | 'douyin_shop' | 'tiktok_shop';
export type CommerceMetricsSource = 'mock_seed' | 'csv_import' | 'provider_sync';

export type VideoPerformanceMetric = {
  id: string;
  videoId: string;
  taskId?: string;
  creativePlanId?: string;
  templateId?: string;
  platform: CommerceMetricsPlatform;
  source: CommerceMetricsSource;
  plays: number;
  clicks: number;
  conversions: number;
  averageWatchRate: number;
  collectedAt: string;
  createdAt: string;
};

export type MetricsImportBatch = {
  id: string;
  source: CommerceMetricsSource;
  fileName?: string;
  totalRows: number;
  acceptedRows: number;
  rejectedRows: number;
  errors: Array<{
    row: number;
    message: string;
  }>;
  createdAt: string;
};

export type TemplatePerformanceSummary = {
  templateId?: string;
  templateName: string;
  sampleCount: number;
  plays: number;
  clicks: number;
  conversions: number;
  clickRate: number;
  conversionRate: number;
  averageWatchRate: number;
  score: number;
};

export type TemplatePerformanceComparison = {
  left: TemplatePerformanceSummary;
  right: TemplatePerformanceSummary;
  winnerTemplateId?: string;
  reasons: string[];
};

export type AnalyticsOverview = {
  totalPlays: number;
  totalClicks: number;
  totalConversions: number;
  clickRate: number;
  conversionRate: number;
  averageWatchRate: number;
  dailyTrend: Array<{
    date: string;
    plays: number;
    clicks: number;
    conversions: number;
  }>;
  templatePerformance: TemplatePerformanceSummary[];
};
