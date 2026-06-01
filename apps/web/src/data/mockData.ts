import type {
  AnalyticsOverview,
  CreativePlan,
  GenerationTask,
  Material,
  Product
} from "@clipshop/shared";
import type { MaterialRole } from "../services/materialMetadata";

type MockMaterial = Material & {
  materialRole?: MaterialRole;
  aiConfidence?: number;
  aiReason?: string;
  isPrimary?: boolean;
};

export const products: Product[] = [
  {
    id: "product_001",
    title: "便携榨汁杯",
    category: "厨房小家电",
    sellingPoints: ["30 秒鲜榨", "一冲即净", "通勤健身随身带"],
    targetAudience: "上班族、健身人群、学生",
    usageScene: "办公室、健身房、旅行途中",
    createdAt: "2026-05-21T09:00:00.000Z"
  },
  {
    id: "product_002",
    title: "旅行收纳包",
    category: "旅行用品",
    sellingPoints: ["分区压缩", "防泼水面料", "一包整理三天行李"],
    targetAudience: "短途旅行者、差旅人群、露营爱好者",
    usageScene: "周末旅行、商务出差、露营装备整理",
    createdAt: "2026-05-21T10:00:00.000Z"
  }
];

export const materials: MockMaterial[] = [
  {
    id: "material_001",
    productId: "product_001",
    type: "image",
    fileUrl: "https://images.unsplash.com/photo-1622484211148-033f70d0e51d?auto=format&fit=crop&w=900&q=80",
    publicUrl: "https://images.unsplash.com/photo-1622484211148-033f70d0e51d?auto=format&fit=crop&w=900&q=80",
    cloudStatus: "uploaded",
    materialRole: "product_primary",
    aiConfidence: 0.94,
    aiReason: "商品主体清晰，杯身完整，适合作为 Seedance 1.5 单张 first_frame。",
    isPrimary: true,
    title: "榨汁杯主图",
    tags: ["主图", "透明杯身", "白色"],
    aiDescription: "白色便携榨汁杯放在明亮厨房台面，旁边有水果。",
    createdAt: "2026-05-21T09:10:00.000Z"
  },
  {
    id: "material_002",
    productId: "product_001",
    type: "image",
    fileUrl: "https://images.unsplash.com/photo-1589733955941-5eeaf752f6dd?auto=format&fit=crop&w=900&q=80",
    cloudStatus: "local_only",
    materialRole: "usage_scene",
    aiConfidence: 0.82,
    aiReason: "水果和饮品氛围强，适合做生活方式场景，不建议作为商品首帧。",
    title: "水果与饮品场景",
    tags: ["场景", "水果", "清爽"],
    aiDescription: "鲜切水果和果汁放在桌面，适合表现健康生活方式。",
    createdAt: "2026-05-21T09:12:00.000Z"
  },
  {
    id: "material_003",
    productId: "product_001",
    type: "video",
    fileUrl: "/mock/blender-demo.mp4",
    thumbnailUrl: "https://images.unsplash.com/photo-1546548970-71785318a17b?auto=format&fit=crop&w=900&q=80",
    cloudStatus: "failed",
    materialRole: "usage_scene",
    aiConfidence: 0.76,
    aiReason: "包含办公室使用片段，可辅助分镜，但当前版本暂不作为 Seedance 1.5 多参考视频。",
    title: "办公室饮用片段",
    tags: ["短视频", "办公室", "通勤"],
    aiDescription: "年轻人在办公室桌面拿起果汁杯，镜头适合做 CTA。",
    duration: 5,
    createdAt: "2026-05-21T09:14:00.000Z"
  },
  {
    id: "material_004",
    productId: "product_002",
    type: "image",
    fileUrl: "https://images.unsplash.com/photo-1553531768-a0f91bc9e42b?auto=format&fit=crop&w=900&q=80",
    publicUrl: "https://images.unsplash.com/photo-1553531768-a0f91bc9e42b?auto=format&fit=crop&w=900&q=80",
    cloudStatus: "uploaded",
    materialRole: "product_primary",
    aiConfidence: 0.91,
    aiReason: "收纳包结构完整可见，适合确认成商品主图。",
    isPrimary: true,
    title: "收纳包平铺",
    tags: ["主图", "分区", "旅行"],
    aiDescription: "多个旅行收纳包平铺展示，能清楚看到分区结构。",
    createdAt: "2026-05-21T10:08:00.000Z"
  },
  {
    id: "material_005",
    productId: "product_002",
    type: "image",
    fileUrl: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=900&q=80",
    cloudStatus: "local_only",
    materialRole: "usage_scene",
    aiConfidence: 0.79,
    aiReason: "痛点明确，适合开场场景，不适合作为商品主图。",
    title: "行李箱整理前",
    tags: ["痛点", "行李箱", "杂乱"],
    aiDescription: "打开的行李箱中衣物杂乱，适合做痛点开场。",
    createdAt: "2026-05-21T10:10:00.000Z"
  },
  {
    id: "material_006",
    productId: "product_002",
    type: "video",
    fileUrl: "/mock/packing-demo.mp4",
    thumbnailUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80",
    cloudStatus: "local_only",
    materialRole: "usage_scene",
    aiConfidence: 0.74,
    aiReason: "展示打包过程，适合过程分镜，等待抽帧能力补齐后可作为参考图。",
    title: "旅行打包过程",
    tags: ["短视频", "打包", "对比"],
    aiDescription: "把衣物按类别放入收纳包，适合做过程展示。",
    duration: 6,
    createdAt: "2026-05-21T10:13:00.000Z"
  }
];

export const creativePlans: CreativePlan[] = [
  {
    id: "plan_001",
    productId: "product_001",
    status: "draft",
    stage: "storyboard_review",
    renderMode: "full_video",
    creativeStrategy: {
      videoGoal: "突出便携榨汁杯在早八通勤场景里的即时价值",
      targetAudience: "上班族、健身人群、学生",
      sellingPointOrder: ["早晨来不及吃水果", "30 秒鲜榨", "通勤健身都能带", "一冲即净"],
      emotionalArc: "时间焦虑 -> 快速解决 -> 场景证明 -> 行动转化",
      styleDirection: "明亮清爽的 TikTok 电商短视频",
      recommendedSceneCount: 4,
      warnings: []
    },
    agentTrace: [
      { agent: "Product Analyst", status: "success", summary: "已识别便携、易清洗、通勤场景" },
      { agent: "Creative Strategy", status: "success", summary: "已生成痛点到转化的短视频策略" },
      { agent: "Compliance", status: "warning", summary: "提示避免减肥、治疗等功效承诺" }
    ],
    style: "pain_point",
    title: "早八也能喝到新鲜果汁",
    hook: "早上来不及吃水果？",
    adCopy: "30 秒打一杯新鲜果汁，通勤路上也能随身带走。",
    cta: "点击了解便携榨汁杯，让新鲜随身走。",
    visualBible: {
      aspectRatio: "9:16",
      style: "TikTok 快节奏电商广告",
      colorTone: "明亮清爽，高饱和水果色点缀",
      lighting: "柔和日光，杯身保持通透高光",
      cameraStyle: "手持近景 + 商品特写 + 快速推近",
      productAppearance: "白色便携榨汁杯，透明杯身，杯盖简洁",
      mainScenes: ["早晨厨房", "办公室桌面", "通勤包侧袋"],
      continuityRules: ["每个分镜保持同一白色杯身", "水果色彩与背景保持清爽对比"]
    },
    scenes: [
      {
        id: "scene_001",
        creativePlanId: "plan_001",
        order: 1,
        goal: "hook",
        materialUsage: "reference_image",
        duration: 3,
        visualDescription: "上班族匆忙出门，桌上水果来不及吃。",
        subtitle: "早上来不及吃水果？",
        voiceover: "早上来不及吃水果？",
        materialId: "material_002",
        seedancePrompt:
          "9:16 TikTok commercial, bright morning kitchen, young office worker rushing out, fresh fruit on table, quick push-in, clean daylight, energetic rhythm",
        warnings: [],
        transition: "zoom"
      },
      {
        id: "scene_002",
        creativePlanId: "plan_001",
        order: 2,
        goal: "feature",
        materialUsage: "reference_image",
        duration: 4,
        visualDescription: "水果块倒入便携榨汁杯，杯身旋转展示容量。",
        subtitle: "切好水果，30 秒鲜榨",
        voiceover: "切好水果，30 秒就能打一杯。",
        materialId: "material_001",
        seedancePrompt:
          "close-up product shot, white portable blender cup, fruit cubes falling into transparent body, sparkling highlights, fast clean motion, ecommerce product focus",
        warnings: [],
        transition: "cut"
      },
      {
        id: "scene_003",
        creativePlanId: "plan_001",
        order: 3,
        goal: "proof",
        materialUsage: "source_clip",
        duration: 4,
        visualDescription: "办公室桌面，用户拿起果汁杯喝一口。",
        subtitle: "上班、健身、旅行都能带",
        voiceover: "办公室、健身房、旅行途中都能带。",
        materialId: "material_003",
        seedancePrompt:
          "office desk lifestyle shot, person picks up white portable juice cup, fresh drink inside, handheld camera, bright and modern, natural smile",
        warnings: ["避免承诺减肥或治疗效果"],
        transition: "fade"
      },
      {
        id: "scene_004",
        creativePlanId: "plan_001",
        order: 4,
        goal: "cta",
        materialUsage: "prompt_only",
        duration: 3,
        visualDescription: "杯子冲洗后一倒即净，最后出现商品特写和 CTA。",
        subtitle: "一冲即净，新鲜随身走",
        voiceover: "一冲即净，点击了解，让新鲜随身走。",
        materialId: "material_001",
        seedancePrompt:
          "product hero ending, portable blender cup rinsed clean under water, final clean product close-up, clear CTA space, bright commercial lighting",
        warnings: [],
        transition: "zoom"
      }
    ],
    complianceWarnings: ["不要使用“最强”“100%健康”等绝对化表达。"],
    continuityWarnings: ["场景切换时保持杯身为白色透明款，避免出现其他型号。"],
    createdAt: "2026-05-21T09:30:00.000Z"
  }
];

export const generationTasks: GenerationTask[] = [
  {
    id: "task_001",
    productId: "product_001",
    creativePlanId: "plan_001",
    status: "success",
    progress: 100,
    currentStep: "生成完成",
    provider: "seedance_1_5",
    outputVideoUrl: "/outputs/demo-blender.mp4",
    logs: [
      { id: "log_001", level: "info", message: "读取 CreativePlan 和素材", timestamp: "2026-05-21T09:31:00.000Z" },
      { id: "log_002", level: "info", message: "Seedance 1.5 生成 4 个分镜片段", timestamp: "2026-05-21T09:33:00.000Z" },
      { id: "log_003", level: "info", message: "FFmpeg 完成字幕与 BGM 后处理", timestamp: "2026-05-21T09:35:00.000Z" }
    ],
    createdAt: "2026-05-21T09:30:30.000Z",
    updatedAt: "2026-05-21T09:35:20.000Z"
  },
  {
    id: "task_002",
    productId: "product_002",
    creativePlanId: "plan_002",
    status: "failed",
    progress: 60,
    currentStep: "合成分镜片段失败",
    provider: "ffmpeg_fallback",
    errorMessage: "素材文件不存在：uploads/material_006.mp4",
    logs: [
      { id: "log_004", level: "info", message: "读取 CreativePlan 和素材", timestamp: "2026-05-21T10:25:00.000Z" },
      { id: "log_005", level: "warn", message: "Seedance 队列超时，切换 FFmpeg fallback", timestamp: "2026-05-21T10:28:00.000Z" },
      { id: "log_006", level: "error", message: "素材文件不存在：uploads/material_006.mp4", timestamp: "2026-05-21T10:29:00.000Z" }
    ],
    createdAt: "2026-05-21T10:24:00.000Z",
    updatedAt: "2026-05-21T10:29:00.000Z"
  }
];

export const analyticsOverview: AnalyticsOverview = {
  totalPlays: 48200,
  totalClicks: 3560,
  conversionRate: 6.8,
  averageWatchRate: 72,
  dailyTrend: [
    { date: "05-15", plays: 3200, clicks: 210, conversions: 18 },
    { date: "05-16", plays: 4100, clicks: 290, conversions: 24 },
    { date: "05-17", plays: 5200, clicks: 360, conversions: 33 },
    { date: "05-18", plays: 6900, clicks: 510, conversions: 46 },
    { date: "05-19", plays: 8400, clicks: 620, conversions: 58 },
    { date: "05-20", plays: 9700, clicks: 730, conversions: 71 },
    { date: "05-21", plays: 10700, clicks: 840, conversions: 80 }
  ],
  abTests: [
    { name: "Hook：早八痛点 vs 健身场景", versionA: 6.1, versionB: 7.4, winner: "B" },
    { name: "CTA：点击了解 vs 立即拥有", versionA: 5.8, versionB: 6.6, winner: "B" },
    { name: "画幅：9:16 vs 16:9", versionA: 7.1, versionB: 4.2, winner: "A" }
  ]
};
