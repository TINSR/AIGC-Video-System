import type {
  CreativePlan,
  GenerationTask,
  InspirationTemplate,
  InspirationTemplateRecommendation,
  InspirationTemplateSourceMode,
  InspirationTemplateStatus,
  Material,
  MaterialRoleAnalysis,
  Product,
  ReferenceVideo,
  ReferenceVideoSourcePlatform,
  ReferenceVideoSourceType,
  Scene,
  ScriptStyle,
  WorkspaceNextAction,
  WorkspaceTaskItem
} from "@clipshop/shared";
import {
  creativePlans,
  generationTasks,
  materials,
  products
} from "../data/mockData";

const RAW_API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";
const USE_MOCK = import.meta.env.VITE_USE_MOCK !== "false";
export const SCENE_PREVIEW_AVAILABLE = import.meta.env.VITE_ENABLE_SCENE_PREVIEW !== "false";

function normalizeApiBaseUrl(value: string) {
  const trimmed = value.replace(/\/$/, "");
  if (/^https?:\/\//i.test(trimmed)) {
    const url = new URL(trimmed);
    if (url.pathname === "" || url.pathname === "/") url.pathname = "/api";
    return url.toString().replace(/\/$/, "");
  }
  if (trimmed === "") return "/api";
  if (trimmed === "/") return "/api";
  return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
}

const API_BASE_URL = normalizeApiBaseUrl(RAW_API_BASE_URL);

export type WorkspaceTaskSummary = WorkspaceTaskItem;

export type ReferenceVideoCreateInput = {
  title: string;
  sourcePlatform: ReferenceVideoSourcePlatform;
  sourceType: ReferenceVideoSourceType;
  sourceUrl?: string;
  sourceNote?: string;
  category: string;
  keywords?: string[];
};

export type ReferenceVideoUploadMetadata = Omit<ReferenceVideoCreateInput, "sourceUrl" | "sourcePlatform" | "sourceType"> & {
  sourceType: "merchant_owned";
};

export type InspirationTemplateGenerateInput = {
  category?: string;
  referenceVideoIds?: string[];
};

export type CommerceMetricsPlatform = "mock" | "douyin_shop" | "tiktok_shop";
export type CommerceMetricsSource = "mock_seed" | "csv_import" | "provider_sync";

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

export type MaterialClipSourceType = "merchant_upload" | "seedance_generated" | "system_asset";
export type MaterialClipType = "image" | "video_clip";
export type ClipSceneType = "product_closeup" | "usage_scene" | "detail" | "packaging" | "lifestyle" | "cta";
export type MotionLevel = "low" | "medium" | "high";
export type SmartEditSceneGoal = NonNullable<Scene["goal"]>;

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
  suitableGoals: SmartEditSceneGoal[];
  createdAt: string;
};

export type SmartEditDecision = {
  sceneId: string;
  sceneOrder: number;
  sceneGoal?: Scene["goal"];
  sceneSubtitle: string;
  sceneDuration: number;
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

export function resolveAssetUrl(path?: string): string | undefined {
  if (!path) return undefined;
  if (/^https?:\/\//i.test(path)) return path;
  if (USE_MOCK) return path;
  if (!path.startsWith("/outputs") && !path.startsWith("/uploads")) return path;

  try {
    return `${new URL(API_BASE_URL, window.location.origin).origin}${path}`;
  } catch {
    return path;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const isFormData = init?.body instanceof FormData;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: isFormData ? undefined : { "Content-Type": "application/json" },
    ...init
  });
  const payload = await response.json().catch(() => undefined);
  if (!response.ok) {
    throw new Error(payload?.error?.message ?? `请求失败：${response.status}`);
  }
  if (payload?.success === undefined) return payload as T;
  if (!payload.success) {
    throw new Error(payload?.error?.message ?? `请求失败：${response.status}`);
  }
  return payload.data as T;
}

const wait = (ms = 180) => new Promise((resolve) => window.setTimeout(resolve, ms));

const mockSeedMetrics: VideoPerformanceMetric[] = [
  {
    id: "metric_seed_001",
    videoId: "video_blender_pain_point",
    taskId: "task_001",
    creativePlanId: "plan_001",
    templateId: "tpl_pain_point",
    platform: "mock",
    source: "mock_seed",
    plays: 12800,
    clicks: 1120,
    conversions: 96,
    averageWatchRate: 76,
    collectedAt: "2026-05-27T08:00:00.000Z",
    createdAt: "2026-05-27T08:05:00.000Z"
  },
  {
    id: "metric_seed_002",
    videoId: "video_packing_scenario",
    taskId: "task_002",
    creativePlanId: "plan_002",
    templateId: "tpl_scenario_seed",
    platform: "mock",
    source: "mock_seed",
    plays: 9400,
    clicks: 670,
    conversions: 42,
    averageWatchRate: 82,
    collectedAt: "2026-05-28T08:00:00.000Z",
    createdAt: "2026-05-28T08:05:00.000Z"
  },
  {
    id: "metric_seed_003",
    videoId: "video_blender_review",
    taskId: "task_001",
    creativePlanId: "plan_001",
    templateId: "tpl_review_proof",
    platform: "douyin_shop",
    source: "mock_seed",
    plays: 7600,
    clicks: 610,
    conversions: 39,
    averageWatchRate: 69,
    collectedAt: "2026-05-29T08:00:00.000Z",
    createdAt: "2026-05-29T08:05:00.000Z"
  },
  {
    id: "metric_seed_004",
    videoId: "video_packing_pain_point",
    taskId: "task_002",
    creativePlanId: "plan_002",
    templateId: "tpl_pain_point",
    platform: "tiktok_shop",
    source: "mock_seed",
    plays: 15300,
    clicks: 1390,
    conversions: 131,
    averageWatchRate: 73,
    collectedAt: "2026-05-30T08:00:00.000Z",
    createdAt: "2026-05-30T08:05:00.000Z"
  }
];

let mockMetrics: VideoPerformanceMetric[] = [...mockSeedMetrics];
let mockImportBatches: MetricsImportBatch[] = [
  {
    id: "batch_mock_seed",
    source: "mock_seed",
    fileName: "day14-demo-metrics.csv",
    totalRows: mockSeedMetrics.length,
    acceptedRows: mockSeedMetrics.length,
    rejectedRows: 0,
    errors: [],
    createdAt: "2026-05-30T08:06:00.000Z"
  }
];

let mockMaterialClipsByProduct = new Map<string, MaterialClip[]>();
let mockSmartEditPlans = new Map<string, SmartEditPlan>();

const templateNames: Record<string, string> = {
  tpl_pain_point: "痛点转化型",
  tpl_scenario_seed: "场景种草型",
  tpl_review_proof: "测评证据型"
};

function percent(numerator: number, denominator: number) {
  if (denominator <= 0) return 0;
  return Number(((numerator / denominator) * 100).toFixed(2));
}

function buildTemplatePerformance(metrics: VideoPerformanceMetric[]): TemplatePerformanceSummary[] {
  const groups = new Map<string, VideoPerformanceMetric[]>();
  metrics.forEach((metric) => {
    const key = metric.templateId || "unassigned";
    groups.set(key, [...(groups.get(key) ?? []), metric]);
  });

  return [...groups.entries()]
    .map(([templateId, items]) => {
      const plays = items.reduce((sum, item) => sum + item.plays, 0);
      const clicks = items.reduce((sum, item) => sum + item.clicks, 0);
      const conversions = items.reduce((sum, item) => sum + item.conversions, 0);
      const averageWatchRate = Number(
        (items.reduce((sum, item) => sum + item.averageWatchRate, 0) / Math.max(items.length, 1)).toFixed(2)
      );
      const clickRate = percent(clicks, plays);
      const conversionRate = percent(conversions, clicks);
      const score = Number((conversionRate * 0.5 + clickRate * 0.3 + averageWatchRate * 0.2).toFixed(2));
      return {
        templateId: templateId === "unassigned" ? undefined : templateId,
        templateName: templateNames[templateId] ?? "未绑定模板",
        sampleCount: items.length,
        plays,
        clicks,
        conversions,
        clickRate,
        conversionRate,
        averageWatchRate,
        score
      };
    })
    .sort((a, b) => b.score - a.score);
}

function buildAnalyticsOverview(metrics: VideoPerformanceMetric[]): AnalyticsOverview {
  const totalPlays = metrics.reduce((sum, item) => sum + item.plays, 0);
  const totalClicks = metrics.reduce((sum, item) => sum + item.clicks, 0);
  const totalConversions = metrics.reduce((sum, item) => sum + item.conversions, 0);
  const dailyMap = new Map<string, { date: string; plays: number; clicks: number; conversions: number }>();
  metrics.forEach((metric) => {
    const date = metric.collectedAt.slice(0, 10);
    const current = dailyMap.get(date) ?? { date, plays: 0, clicks: 0, conversions: 0 };
    current.plays += metric.plays;
    current.clicks += metric.clicks;
    current.conversions += metric.conversions;
    dailyMap.set(date, current);
  });

  return {
    totalPlays,
    totalClicks,
    totalConversions,
    clickRate: percent(totalClicks, totalPlays),
    conversionRate: percent(totalConversions, totalClicks),
    averageWatchRate: Number(
      (metrics.reduce((sum, item) => sum + item.averageWatchRate, 0) / Math.max(metrics.length, 1)).toFixed(2)
    ),
    dailyTrend: [...dailyMap.values()].sort((a, b) => a.date.localeCompare(b.date)),
    templatePerformance: buildTemplatePerformance(metrics)
  };
}

function compareTemplateSummaries(
  left: TemplatePerformanceSummary,
  right: TemplatePerformanceSummary
): TemplatePerformanceComparison {
  const winner = left.score >= right.score ? left : right;
  const conversionDiff = Math.abs(left.conversionRate - right.conversionRate).toFixed(2);
  const watchWinner = left.averageWatchRate >= right.averageWatchRate ? left : right;
  return {
    left,
    right,
    winnerTemplateId: winner.templateId,
    reasons: [
      `“${winner.templateName}”综合评分更高，当前为 ${winner.score} 分。`,
      `两者转化率相差 ${conversionDiff} 个百分点。`,
      `“${watchWinner.templateName}”平均完播率更高。`
    ]
  };
}

function parseCsvLine(line: string) {
  return line.split(",").map((value) => value.trim());
}

function inferClipSceneType(material: Material): ClipSceneType {
  const text = [material.title, material.tags.join(" "), material.aiDescription].join(" ");
  if (/主图|主体|商品|close/i.test(text)) return "product_closeup";
  if (/细节|拉链|面料|防泼|隔层|detail/i.test(text)) return "detail";
  if (/包装|开箱|pack/i.test(text)) return "packaging";
  if (/cta|促单|结尾/i.test(text)) return "cta";
  if (/场景|使用|旅行|办公室|生活|lifestyle/i.test(text)) return "usage_scene";
  return material.type === "image" ? "product_closeup" : "lifestyle";
}

function goalsForSceneType(sceneType: ClipSceneType): SmartEditSceneGoal[] {
  if (sceneType === "product_closeup") return ["feature", "cta"];
  if (sceneType === "detail") return ["feature", "proof"];
  if (sceneType === "usage_scene" || sceneType === "lifestyle") return ["hook", "proof"];
  if (sceneType === "cta") return ["cta"];
  return ["feature"];
}

function buildMockMaterialClips(productId: string): MaterialClip[] {
  const productMaterials = materials.filter((material) => material.productId === productId);
  const now = new Date().toISOString();
  return productMaterials.flatMap<MaterialClip>((material) => {
    const sceneType = inferClipSceneType(material);
    const baseTags = [...material.tags, sceneType, material.title].filter(Boolean);
    if (material.type === "image") {
      return [
        {
          id: `clip_${material.id}_image`,
          productId,
          materialId: material.id,
          sourceType: "merchant_upload",
          type: "image",
          fileUrl: material.fileUrl,
          thumbnailUrl: material.thumbnailUrl ?? material.fileUrl,
          duration: 3,
          summary: material.aiDescription || `${material.title} 图片素材`,
          tags: baseTags,
          sceneType,
          visualQuality: material.isPrimary ? 0.92 : 0.78,
          motionLevel: "low",
          suitableGoals: goalsForSceneType(sceneType),
          createdAt: now
        } satisfies MaterialClip
      ];
    }

    const duration = Math.max(3, Number(material.duration || 6));
    return [
      {
        id: `clip_${material.id}_video_1`,
        productId,
        materialId: material.id,
        sourceType: "merchant_upload",
        type: "video_clip",
        fileUrl: material.fileUrl,
        thumbnailUrl: material.thumbnailUrl,
        startTime: 0,
        endTime: Math.min(duration, 4),
        duration: Math.min(duration, 4),
        summary: material.aiDescription || `${material.title} 视频片段`,
        tags: baseTags,
        sceneType,
        visualQuality: 0.82,
        motionLevel: "medium",
        suitableGoals: goalsForSceneType(sceneType),
        createdAt: now
      } satisfies MaterialClip
    ];
  });
}

function scoreClipForScene(scene: Scene, clip: MaterialClip) {
  const text = [scene.subtitle, scene.voiceover, scene.visualDescription].join(" ");
  const matchedTags = clip.tags.filter((tag) => tag && text.includes(tag));
  const goalMatched = scene.goal ? clip.suitableGoals.includes(scene.goal) : false;
  const durationDiff = Math.abs(Number(scene.duration || 0) - clip.duration);
  const productFocused = clip.sceneType === "product_closeup" || clip.type === "image";
  const score = Math.round(
    (goalMatched ? 35 : 12) +
      Math.min(25, matchedTags.length * 12) +
      (productFocused ? 18 : 10) +
      clip.visualQuality * 15 +
      (durationDiff <= 1 ? 5 : durationDiff <= 2 ? 3 : 1)
  );

  const reasons = [
    goalMatched ? `命中分镜目标 ${scene.goal}` : "按分镜语义选择相近素材",
    matchedTags.length > 0 ? `命中关键词：${matchedTags.slice(0, 3).join("、")}` : `素材摘要匹配：${clip.summary}`,
    productFocused ? "商品主体清晰" : "适合补充使用场景",
    durationDiff <= 1 ? "片段时长适合当前分镜" : "片段可裁剪适配当前分镜"
  ];

  return { score, reasons };
}

function buildMockSmartEditPlan(plan: CreativePlan, clips: MaterialClip[]): SmartEditPlan {
  const sortedScenes = [...plan.scenes].sort((a, b) => a.order - b.order);
  const fallbackClip = clips.find((clip) => clip.type === "image") ?? clips[0];
  const usedClipIds = new Set<string>();
  const decisions = sortedScenes.map((scene) => {
    const ranked = clips
      .map((clip) => ({ clip, ...scoreClipForScene(scene, clip) }))
      .sort((a, b) => {
        const repeatPenaltyA = usedClipIds.has(a.clip.id) ? 10 : 0;
        const repeatPenaltyB = usedClipIds.has(b.clip.id) ? 10 : 0;
        return b.score - repeatPenaltyB - (a.score - repeatPenaltyA);
      });
    const selected = ranked[0]?.clip ?? fallbackClip;
    const matched = ranked[0] ?? (selected ? { clip: selected, score: 55, reasons: ["素材不足，使用商品图兜底"] } : undefined);
    if (selected) usedClipIds.add(selected.id);
    return {
      sceneId: scene.id,
      sceneOrder: scene.order,
      sceneGoal: scene.goal,
      sceneSubtitle: scene.subtitle,
      sceneDuration: Number(scene.duration || 0),
      clip: selected,
      score: matched?.score ?? 0,
      reasons: matched?.reasons ?? ["当前没有可用素材片段"],
      fallbackUsed: !ranked[0] || (matched?.score ?? 0) < 60
    };
  });

  return {
    creativePlanId: plan.id,
    decisions,
    totalDuration: decisions.reduce((sum, decision) => sum + decision.sceneDuration, 0)
  };
}

function normalizeSmartEditError(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  if (/SMART_EDIT_PLAN_NOT_FOUND/i.test(message)) return "请先重新匹配";
  if (/NO_MATERIAL_CLIPS/i.test(message)) return "请先分析素材";
  return message;
}

async function parseMetricsCsv(file: File): Promise<{ metrics: VideoPerformanceMetric[]; batch: MetricsImportBatch }> {
  const text = await file.text();
  const rows = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const [headerLine, ...dataRows] = rows;
  const expected = [
    "videoId",
    "taskId",
    "creativePlanId",
    "templateId",
    "platform",
    "plays",
    "clicks",
    "conversions",
    "averageWatchRate",
    "collectedAt"
  ];
  const headers = parseCsvLine(headerLine ?? "");
  const errors: MetricsImportBatch["errors"] = [];
  const accepted: VideoPerformanceMetric[] = [];

  if (expected.some((item, index) => headers[index] !== item)) {
    return {
      metrics: [],
      batch: {
        id: `batch_${Date.now()}`,
        source: "csv_import",
        fileName: file.name,
        totalRows: dataRows.length,
        acceptedRows: 0,
        rejectedRows: dataRows.length,
        errors: [{ row: 1, message: `CSV 表头必须为：${expected.join(",")}` }],
        createdAt: new Date().toISOString()
      }
    };
  }

  dataRows.slice(0, 500).forEach((line, index) => {
    const rowNumber = index + 2;
    const [videoId, taskId, creativePlanId, templateId, platform, playsRaw, clicksRaw, conversionsRaw, watchRaw, collectedAt] =
      parseCsvLine(line);
    const plays = Number(playsRaw);
    const clicks = Number(clicksRaw);
    const conversions = Number(conversionsRaw);
    const averageWatchRate = Number(watchRaw);
    const rowErrors: string[] = [];

    if (!videoId) rowErrors.push("videoId 不能为空");
    if (!["mock", "douyin_shop", "tiktok_shop"].includes(platform)) rowErrors.push("platform 不合法");
    if (!Number.isFinite(plays) || plays < 0) rowErrors.push("plays 必须大于等于 0");
    if (!Number.isFinite(clicks) || clicks < 0) rowErrors.push("clicks 必须大于等于 0");
    if (!Number.isFinite(conversions) || conversions < 0) rowErrors.push("conversions 必须大于等于 0");
    if (clicks > plays) rowErrors.push("clicks 不能大于 plays");
    if (conversions > clicks) rowErrors.push("conversions 不能大于 clicks");
    if (!Number.isFinite(averageWatchRate) || averageWatchRate < 0 || averageWatchRate > 100) {
      rowErrors.push("averageWatchRate 必须在 0-100");
    }
    if (!Number.isFinite(Date.parse(collectedAt))) rowErrors.push("collectedAt 必须是可解析日期");

    if (rowErrors.length > 0) {
      errors.push({ row: rowNumber, message: rowErrors.join("；") });
      return;
    }

    accepted.push({
      id: `metric_csv_${Date.now()}_${index}`,
      videoId,
      taskId: taskId || undefined,
      creativePlanId: creativePlanId || undefined,
      templateId: templateId || undefined,
      platform: platform as CommerceMetricsPlatform,
      source: "csv_import",
      plays,
      clicks,
      conversions,
      averageWatchRate,
      collectedAt: new Date(collectedAt).toISOString(),
      createdAt: new Date().toISOString()
    });
  });

  if (dataRows.length > 500) {
    errors.push({ row: 501, message: "单次 CSV 最多导入 500 行，超出部分已拒绝" });
  }

  return {
    metrics: accepted,
    batch: {
      id: `batch_${Date.now()}`,
      source: "csv_import",
      fileName: file.name,
      totalRows: dataRows.length,
      acceptedRows: accepted.length,
      rejectedRows: dataRows.length - accepted.length,
      errors,
      createdAt: new Date().toISOString()
    }
  };
}

function referenceVideoApiUnavailable(): never {
  throw new Error("参考视频库需要真实后端 API。请设置 VITE_USE_MOCK=false 后连接 Day12 ReferenceVideo 服务。");
}

function inspirationTemplateApiUnavailable(): never {
  throw new Error("灵感模板库需要真实后端 API。请设置 VITE_USE_MOCK=false 后连接 Day13 InspirationTemplate 服务。");
}

export const api = {
  async getWorkspaceTasks(): Promise<WorkspaceTaskSummary[]> {
    if (!USE_MOCK) return request<WorkspaceTaskSummary[]>("/workspace/tasks");
    await wait();
    return products.map((product) => {
      const productPlans = creativePlans.filter((plan) => plan.productId === product.id);
      const productTasks = generationTasks.filter((task) => task.productId === product.id);
      const latestPlan = productPlans[0];
      const latestTask = productTasks[0];
      const materialsCount = materials.filter((material) => material.productId === product.id).length;
      const nextAction: WorkspaceNextAction = latestTask
        ? latestTask.status === "success"
          ? "view_video"
          : latestTask.status === "failed"
            ? "retry"
            : "view_task"
        : latestPlan
          ? latestPlan.status === "approved"
            ? "render_video"
            : "review_plan"
          : materialsCount > 0
            ? "generate_plan"
            : "upload_material";

      return {
        product,
        materialsCount,
        creativePlansCount: productPlans.length,
        latestPlan: latestPlan ? { ...latestPlan, scenesCount: latestPlan.scenes.length } : undefined,
        latestTask,
        nextAction
      };
    });
  },
  async getProducts(): Promise<Product[]> {
    if (!USE_MOCK) return request<Product[]>("/products");
    await wait();
    return products;
  },
  async getProduct(productId: string): Promise<Product> {
    if (!USE_MOCK) return request<Product>(`/products/${productId}`);
    await wait();
    return products.find((product) => product.id === productId) ?? products[0];
  },
  async createProduct(input: Omit<Product, "id" | "createdAt">): Promise<Product> {
    if (!USE_MOCK) {
      return request<Product>("/products", {
        method: "POST",
        body: JSON.stringify(input)
      });
    }
    await wait();
    return {
      id: `product_${Date.now()}`,
      createdAt: new Date().toISOString(),
      ...input
    };
  },
  async getMaterials(productId: string): Promise<Material[]> {
    if (!USE_MOCK) return request<Material[]>(`/products/${productId}/materials`);
    await wait();
    return materials.filter((material) => material.productId === productId);
  },
  async analyzeMaterialRoles(productId: string): Promise<MaterialRoleAnalysis[]> {
    if (!USE_MOCK) return request<MaterialRoleAnalysis[]>(`/products/${productId}/materials/analyze-roles`);
    await wait();
    return [];
  },
  async setPrimaryMaterial(productId: string, materialId: string): Promise<Material[]> {
    if (!USE_MOCK) {
      return request<Material[]>(`/products/${productId}/materials/${materialId}/primary`, {
        method: "PUT"
      });
    }
    await wait();
    materials.forEach((material) => {
      if (material.productId === productId) material.isPrimary = material.id === materialId;
    });
    return materials.filter((material) => material.productId === productId);
  },
  async uploadMaterial(productId: string, file: File): Promise<Material> {
    if (!USE_MOCK) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", file.name);
      formData.append("tags", "上传素材");
      return request<Material>(`/products/${productId}/materials`, {
        method: "POST",
        body: formData
      });
    }
    await wait();
    const material: Material = {
      id: `material_${Date.now()}`,
      productId,
      type: file.type.startsWith("video/") ? "video" : "image",
      fileUrl: URL.createObjectURL(file),
      cloudStatus: "local_only",
      thumbnailUrl: file.type.startsWith("video/") ? undefined : URL.createObjectURL(file),
      title: file.name,
      tags: ["上传素材"],
      aiDescription: "",
      duration: file.type.startsWith("video/") ? 10 : undefined,
      createdAt: new Date().toISOString()
    };
    materials.unshift(material);
    return material;
  },
  async generateCreativePlan(
    productId: string,
    input: { style: ScriptStyle; merchantAdCopy: string; maxDuration: number; referenceVideoId?: string; templateId?: string }
  ): Promise<CreativePlan> {
    if (!USE_MOCK) {
      return request<CreativePlan>(`/products/${productId}/creative-plans/generate`, {
        method: "POST",
        body: JSON.stringify({ ...input, language: "zh-CN" })
      });
    }
    await wait(400);
    return { ...creativePlans[0], productId, style: input.style, templateId: input.templateId };
  },
  async getInspirationTemplates(query?: {
    category?: string;
    keyword?: string;
    sourceMode?: InspirationTemplateSourceMode;
    status?: InspirationTemplateStatus;
  }): Promise<InspirationTemplate[]> {
    if (!USE_MOCK) {
      const params = new URLSearchParams();
      Object.entries(query ?? {}).forEach(([key, value]) => {
        if (value) params.set(key, value);
      });
      const suffix = params.toString() ? `?${params.toString()}` : "";
      return request<InspirationTemplate[]>(`/inspiration-templates${suffix}`);
    }
    await wait();
    return [];
  },
  async getInspirationTemplate(id: string): Promise<InspirationTemplate> {
    if (!USE_MOCK) return request<InspirationTemplate>(`/inspiration-templates/${id}`);
    await wait();
    return inspirationTemplateApiUnavailable();
  },
  async seedBuiltInInspirationTemplates(): Promise<InspirationTemplate[]> {
    if (!USE_MOCK) {
      return request<InspirationTemplate[]>("/inspiration-templates/seed-builtins", {
        method: "POST"
      });
    }
    await wait();
    return inspirationTemplateApiUnavailable();
  },
  async generateInspirationTemplates(input: InspirationTemplateGenerateInput): Promise<InspirationTemplate[]> {
    if (!USE_MOCK) {
      return request<InspirationTemplate[]>("/inspiration-templates/generate", {
        method: "POST",
        body: JSON.stringify(input)
      });
    }
    await wait();
    return inspirationTemplateApiUnavailable();
  },
  async getInspirationTemplateRecommendations(productId: string): Promise<InspirationTemplateRecommendation[]> {
    if (!USE_MOCK) {
      return request<InspirationTemplateRecommendation[]>(`/products/${productId}/inspiration-templates/recommendations`);
    }
    await wait();
    return [];
  },
  async getReferenceVideos(): Promise<ReferenceVideo[]> {
    if (!USE_MOCK) return request<ReferenceVideo[]>("/reference-videos");
    await wait();
    return [];
  },
  async getReferenceVideo(id: string): Promise<ReferenceVideo> {
    if (!USE_MOCK) return request<ReferenceVideo>(`/reference-videos/${id}`);
    await wait();
    return referenceVideoApiUnavailable();
  },
  async createReferenceVideo(input: ReferenceVideoCreateInput): Promise<ReferenceVideo> {
    if (!USE_MOCK) {
      return request<ReferenceVideo>("/reference-videos", {
        method: "POST",
        body: JSON.stringify(input)
      });
    }
    await wait();
    return referenceVideoApiUnavailable();
  },
  async uploadReferenceVideo(file: File, metadata: ReferenceVideoUploadMetadata): Promise<ReferenceVideo> {
    if (!USE_MOCK) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("metadata", JSON.stringify(metadata));
      Object.entries(metadata).forEach(([key, value]) => {
        if (value !== undefined) formData.append(key, Array.isArray(value) ? value.join(",") : String(value));
      });
      return request<ReferenceVideo>("/reference-videos/upload", {
        method: "POST",
        body: formData
      });
    }
    await wait();
    return referenceVideoApiUnavailable();
  },
  async analyzeReferenceVideo(id: string): Promise<ReferenceVideo> {
    if (!USE_MOCK) {
      return request<ReferenceVideo>(`/reference-videos/${id}/analyze`, {
        method: "POST"
      });
    }
    await wait();
    return referenceVideoApiUnavailable();
  },
  async getCreativePlan(planId: string): Promise<CreativePlan> {
    if (!USE_MOCK) return request<CreativePlan>(`/creative-plans/${planId}`);
    await wait();
    return creativePlans.find((plan) => plan.id === planId) ?? creativePlans[0];
  },
  async getCreativePlans(productId: string): Promise<CreativePlan[]> {
    if (!USE_MOCK) return request<CreativePlan[]>(`/products/${productId}/creative-plans`);
    await wait();
    return creativePlans.filter((plan) => plan.productId === productId);
  },
  async updateCreativePlan(planId: string, input: Partial<CreativePlan>): Promise<CreativePlan> {
    if (!USE_MOCK) {
      return request<CreativePlan>(`/creative-plans/${planId}`, {
        method: "PUT",
        body: JSON.stringify(input)
      });
    }
    await wait();
    const planIndex = creativePlans.findIndex((item) => item.id === planId);
    const plan = planIndex >= 0 ? creativePlans[planIndex] : creativePlans[0];
    const updated = { ...plan, ...input, id: planId };
    creativePlans[planIndex >= 0 ? planIndex : 0] = updated;
    return updated;
  },
  async updateScene(planId: string, sceneId: string, input: Partial<Scene>): Promise<Scene> {
    if (!USE_MOCK) {
      return request<Scene>(`/creative-plans/${planId}/scenes/${sceneId}`, {
        method: "PUT",
        body: JSON.stringify(input)
      });
    }
    await wait();
    const plan = creativePlans.find((item) => item.id === planId) ?? creativePlans[0];
    const scene = plan.scenes.find((item) => item.id === sceneId) ?? plan.scenes[0];
    const updated = { ...scene, ...input };
    plan.scenes = plan.scenes.map((item) => (item.id === sceneId ? updated : item));
    return updated;
  },
  async regenerateScene(planId: string, sceneId: string): Promise<Scene> {
    if (!USE_MOCK) {
      return request<Scene>(`/creative-plans/${planId}/scenes/${sceneId}/regenerate`, {
        method: "POST",
        body: JSON.stringify({ modifyRequest: "Regenerate scene copy and Seedance prompt." })
      });
    }
    await wait(500);
    const plan = creativePlans.find((item) => item.id === planId) ?? creativePlans[0];
    const scene = plan.scenes.find((item) => item.id === sceneId) ?? plan.scenes[0];
    const updated = {
      ...scene,
      subtitle: `${scene.subtitle} / 已优化`,
      voiceover: `${scene.voiceover} 现在突出一个更清晰的购买理由。`,
      seedancePrompt: `${scene.seedancePrompt}, refreshed ecommerce short-video copy, clearer product focus`
    };
    plan.scenes = plan.scenes.map((item) => (item.id === sceneId ? updated : item));
    return updated;
  },
  async renderScenePreview(planId: string, sceneId: string): Promise<Scene> {
    if (!USE_MOCK) {
      const task = await request<GenerationTask>(`/creative-plans/${planId}/scenes/${sceneId}/render`, {
        method: "POST"
      });
      const timeoutAt = Date.now() + 10 * 60 * 1000;
      let latestTask = task;

      while (latestTask.status === "pending" || latestTask.status === "running") {
        if (Date.now() >= timeoutAt) throw new Error("分镜预览等待超时，请稍后在任务列表中查看结果");
        await wait(1500);
        latestTask = await request<GenerationTask>(`/tasks/${task.id}`);
      }

      if (latestTask.status === "failed") {
        throw new Error(latestTask.errorMessage || "分镜预览生成失败");
      }

      const plan = await request<CreativePlan>(`/creative-plans/${planId}`);
      const scene = plan.scenes.find((item) => item.id === sceneId);
      if (!scene) throw new Error("分镜预览已完成，但未找到对应分镜");
      return scene;
    }
    await wait(500);
    const plan = creativePlans.find((item) => item.id === planId) ?? creativePlans[0];
    const scene = plan.scenes.find((item) => item.id === sceneId) ?? plan.scenes[0];
    const updated: Scene = {
      ...scene,
      previewVideoUrl: "/outputs/mock-scene-preview.mp4",
      renderStatus: "success"
    };
    plan.scenes = plan.scenes.map((item) => (item.id === sceneId ? updated : item));
    return updated;
  },
  async approvePlan(planId: string): Promise<CreativePlan> {
    if (!USE_MOCK) {
      return request<CreativePlan>(`/creative-plans/${planId}/approve`, { method: "POST" });
    }
    await wait();
    const plan = creativePlans.find((item) => item.id === planId) ?? creativePlans[0];
    plan.status = "approved";
    return { ...plan, id: planId, status: "approved" };
  },
  async analyzeMaterialClips(productId: string): Promise<MaterialClip[]> {
    if (!USE_MOCK) {
      try {
        return await request<MaterialClip[]>(`/products/${productId}/material-clips/analyze`, {
          method: "POST",
          body: JSON.stringify({ force: true })
        });
      } catch (err) {
        throw new Error(normalizeSmartEditError(err));
      }
    }
    await wait(500);
    const clips = buildMockMaterialClips(productId);
    mockMaterialClipsByProduct.set(productId, clips);
    return clips;
  },
  async getMaterialClips(productId: string): Promise<MaterialClip[]> {
    if (!USE_MOCK) {
      try {
        return await request<MaterialClip[]>(`/products/${productId}/material-clips`);
      } catch (err) {
        throw new Error(normalizeSmartEditError(err));
      }
    }
    await wait();
    return mockMaterialClipsByProduct.get(productId) ?? [];
  },
  async createSmartEditPlan(planId: string): Promise<SmartEditPlan> {
    if (!USE_MOCK) {
      try {
        return await request<SmartEditPlan>(`/creative-plans/${planId}/smart-edit/plan`, {
          method: "POST",
          body: JSON.stringify({ force: true })
        });
      } catch (err) {
        throw new Error(normalizeSmartEditError(err));
      }
    }
    await wait(500);
    const plan = creativePlans.find((item) => item.id === planId) ?? creativePlans[0];
    let clips = mockMaterialClipsByProduct.get(plan.productId) ?? [];
    if (clips.length === 0) {
      clips = buildMockMaterialClips(plan.productId);
      mockMaterialClipsByProduct.set(plan.productId, clips);
    }
    const smartEditPlan = buildMockSmartEditPlan(plan, clips);
    mockSmartEditPlans.set(planId, smartEditPlan);
    return smartEditPlan;
  },
  async getSmartEditPlan(planId: string): Promise<SmartEditPlan> {
    if (!USE_MOCK) {
      try {
        return await request<SmartEditPlan>(`/creative-plans/${planId}/smart-edit/plan`);
      } catch (err) {
        throw new Error(normalizeSmartEditError(err));
      }
    }
    await wait();
    const plan = mockSmartEditPlans.get(planId);
    if (!plan) throw new Error("请先重新匹配");
    return plan;
  },
  async replaceSmartEditDecisionClip(planId: string, sceneId: string, clipId: string): Promise<SmartEditPlan> {
    if (!USE_MOCK) {
      try {
        return await request<SmartEditPlan>(`/creative-plans/${planId}/smart-edit/plan`, {
          method: "POST",
          body: JSON.stringify({
            force: false,
            overrides: [{ sceneId, clipId }]
          })
        });
      } catch (err) {
        throw new Error(normalizeSmartEditError(err));
      }
    }
    await wait(260);
    const plan = creativePlans.find((item) => item.id === planId) ?? creativePlans[0];
    const clips = mockMaterialClipsByProduct.get(plan.productId) ?? buildMockMaterialClips(plan.productId);
    mockMaterialClipsByProduct.set(plan.productId, clips);
    const clip = clips.find((item) => item.id === clipId);
    const scene = plan.scenes.find((item) => item.id === sceneId);
    if (!clip || !scene) throw new Error("未找到要替换的素材片段");
    const currentPlan = mockSmartEditPlans.get(planId) ?? buildMockSmartEditPlan(plan, clips);
    const scored = scoreClipForScene(scene, clip);
    const nextPlan: SmartEditPlan = {
      ...currentPlan,
      decisions: currentPlan.decisions.map((decision) =>
        decision.sceneId === sceneId
          ? {
              ...decision,
              clip,
              score: scored.score,
              reasons: ["手动选择素材", ...scored.reasons],
              fallbackUsed: false
            }
          : decision
      )
    };
    mockSmartEditPlans.set(planId, nextPlan);
    return nextPlan;
  },
  async renderSmartClipEdit(planId: string): Promise<GenerationTask> {
    if (!USE_MOCK) {
      try {
        return await request<GenerationTask>(`/creative-plans/${planId}/render`, {
          method: "POST",
          body: JSON.stringify({
            renderMode: "smart_clip_edit",
            withSubtitle: true,
            withTts: false,
            withBgm: true
          })
        });
      } catch (err) {
        throw new Error(normalizeSmartEditError(err));
      }
    }
    await wait();
    if (!mockSmartEditPlans.has(planId)) {
      await api.createSmartEditPlan(planId);
    }
    const task = {
      ...generationTasks[0],
      id: `task_smart_${Date.now()}`,
      creativePlanId: planId,
      provider: "smart_clip_edit",
      type: "render",
      renderMode: "smart_clip_edit",
      status: "running",
      progress: 20,
      currentStep: "Smart Clip Editing 正在合成素材片段",
      outputVideoUrl: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      logs: [
        {
          id: `log_smart_${Date.now()}`,
          level: "info",
          message: "已根据 SmartEditPlan 创建智能剪辑任务",
          timestamp: new Date().toISOString()
        }
      ]
    };
    generationTasks.unshift(task as unknown as GenerationTask);
    return task as unknown as GenerationTask;
  },
  async renderPlan(planId: string, options?: { primaryMaterialId?: string }): Promise<GenerationTask> {
    if (!USE_MOCK) {
      return request<GenerationTask>(`/creative-plans/${planId}/render`, {
        method: "POST",
        body: JSON.stringify({
          provider: "seedance_1_5",
          aspectRatio: "9:16",
          withTts: true,
          withBgm: true,
          fallbackToFfmpeg: true,
          primaryMaterialId: options?.primaryMaterialId
        })
      });
    }
    await wait();
    return { ...generationTasks[0], creativePlanId: planId };
  },
  async getTask(taskId: string): Promise<GenerationTask> {
    if (!USE_MOCK) return request<GenerationTask>(`/tasks/${taskId}`);
    await wait();
    return generationTasks.find((task) => task.id === taskId) ?? generationTasks[0];
  },
  async getTasks(): Promise<GenerationTask[]> {
    if (!USE_MOCK) return request<GenerationTask[]>("/tasks");
    await wait();
    return generationTasks;
  },
  async retryTask(taskId: string): Promise<GenerationTask> {
    if (!USE_MOCK) {
      return request<GenerationTask>(`/tasks/${taskId}/retry`, { method: "POST" });
    }
    await wait();
    const task = generationTasks.find((item) => item.id === taskId) ?? generationTasks[0];
    return {
      ...task,
      status: "pending",
      progress: 0,
      currentStep: "任务已重新创建",
      errorMessage: undefined,
      updatedAt: new Date().toISOString()
    };
  },
  async getAnalytics(): Promise<AnalyticsOverview> {
    if (!USE_MOCK) return request<AnalyticsOverview>("/analytics/overview");
    await wait();
    return buildAnalyticsOverview(mockMetrics);
  },
  async seedMockMetrics(): Promise<VideoPerformanceMetric[]> {
    if (!USE_MOCK) {
      return request<VideoPerformanceMetric[]>("/analytics/metrics/mock-seed", { method: "POST" });
    }
    await wait();
    mockMetrics = [...mockSeedMetrics];
    mockImportBatches = [
      {
        id: `batch_mock_seed_${Date.now()}`,
        source: "mock_seed",
        fileName: "day14-demo-metrics.csv",
        totalRows: mockSeedMetrics.length,
        acceptedRows: mockSeedMetrics.length,
        rejectedRows: 0,
        errors: [],
        createdAt: new Date().toISOString()
      },
      ...mockImportBatches.filter((batch) => batch.source !== "mock_seed")
    ];
    return mockMetrics;
  },
  async resetMockMetrics(): Promise<void> {
    if (!USE_MOCK) {
      await request<void>("/analytics/metrics/mock-reset", { method: "POST" });
      return;
    }
    await wait();
    mockMetrics = mockMetrics.filter((metric) => metric.source !== "mock_seed");
    mockImportBatches = mockImportBatches.filter((batch) => batch.source !== "mock_seed");
  },
  async importMetricsCsv(file: File): Promise<MetricsImportBatch> {
    if (!USE_MOCK) {
      const formData = new FormData();
      formData.append("file", file);
      return request<MetricsImportBatch>("/analytics/metrics/import-csv", {
        method: "POST",
        body: formData
      });
    }
    await wait(300);
    const result = await parseMetricsCsv(file);
    mockMetrics = [...result.metrics, ...mockMetrics];
    mockImportBatches = [result.batch, ...mockImportBatches];
    return result.batch;
  },
  async getMetrics(query?: {
    platform?: CommerceMetricsPlatform;
    days?: 7 | 30;
  }): Promise<VideoPerformanceMetric[]> {
    if (!USE_MOCK) {
      const params = new URLSearchParams();
      if (query?.platform) params.set("platform", query.platform);
      if (query?.days) params.set("days", String(query.days));
      const suffix = params.toString() ? `?${params.toString()}` : "";
      return request<VideoPerformanceMetric[]>(`/analytics/metrics${suffix}`);
    }
    await wait();
    const now = Date.now();
    const days = query?.days ?? 7;
    return mockMetrics.filter((metric) => {
      const platformMatched = query?.platform ? metric.platform === query.platform : true;
      const withinRange = now - Date.parse(metric.collectedAt) <= days * 24 * 60 * 60 * 1000 || days === 30;
      return platformMatched && withinRange;
    });
  },
  async getMetricsImportBatches(): Promise<MetricsImportBatch[]> {
    if (!USE_MOCK) return request<MetricsImportBatch[]>("/analytics/metrics/import-batches");
    await wait();
    return mockImportBatches;
  },
  async getTemplatePerformance(): Promise<TemplatePerformanceSummary[]> {
    if (!USE_MOCK) return request<TemplatePerformanceSummary[]>("/analytics/template-performance");
    await wait();
    return buildTemplatePerformance(mockMetrics);
  },
  async compareTemplatePerformance(
    leftTemplateId: string,
    rightTemplateId: string
  ): Promise<TemplatePerformanceComparison> {
    if (!USE_MOCK) {
      const params = new URLSearchParams({ leftTemplateId, rightTemplateId });
      return request<TemplatePerformanceComparison>(`/analytics/template-performance/compare?${params.toString()}`);
    }
    await wait();
    const summaries = buildTemplatePerformance(mockMetrics);
    const left = summaries.find((item) => item.templateId === leftTemplateId);
    const right = summaries.find((item) => item.templateId === rightTemplateId);
    if (!left || !right) throw new Error("请选择两条已有指标的模板进行对比");
    return compareTemplateSummaries(left, right);
  }
};
