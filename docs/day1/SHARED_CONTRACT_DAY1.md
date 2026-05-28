# Day 1 共享契约：类型、API、任务流

> 用途：给所有 Agent 对齐字段和接口  
> 原则：前端、后端、AI/视频模块必须使用同一套命名

---

## 1. 最小端到端路径

第一版只保证这一条链路稳定：

```text
创建商品
-> 上传 3 个素材
-> 选择视频风格
-> AI 生成 CreativePlan，包括广告词、Visual Bible、4 个分镜和 Seedance Prompt
-> 用户审核并编辑其中 1 个分镜
-> 用户确认方案
-> 创建生成任务
-> Seedance 1.5 生成视频片段，FFmpeg 后处理
-> 前端预览和下载
```

---

## 2. 共享 TypeScript 类型

```ts
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
  duration: number;
  visualDescription: string;
  subtitle: string;
  voiceover: string;
  materialId?: string;
  seedancePrompt: string;
  warnings: string[];
  transition: "cut" | "fade" | "zoom";
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
```

---

## 3. API 返回格式

所有接口统一返回：

```ts
export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
};
```

示例：

```json
{
  "success": true,
  "data": {
    "id": "product_001",
    "title": "便携榨汁杯"
  }
}
```

错误示例：

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "商品标题不能为空"
  }
}
```

---

## 4. API 清单

### 商品

```text
POST /api/products
GET /api/products
GET /api/products/:id
PUT /api/products/:id
```

### 素材

```text
POST /api/products/:id/materials
GET /api/products/:id/materials
PUT /api/materials/:id
DELETE /api/materials/:id
```

### 创意方案

```text
POST /api/products/:id/creative-plans/generate
GET /api/products/:id/creative-plans
GET /api/creative-plans/:id
PUT /api/creative-plans/:id
POST /api/creative-plans/:id/approve
PUT /api/creative-plans/:id/scenes/:sceneId
POST /api/creative-plans/:id/scenes/:sceneId/regenerate
```

### 视频任务

```text
POST /api/creative-plans/:id/render
GET /api/tasks/:id
POST /api/tasks/:id/retry
```

### 数据看板

```text
GET /api/analytics/overview
GET /api/analytics/videos/:videoId
GET /api/analytics/ab-tests
```

---

## 5. 关键请求/响应示例

### 创建商品

请求：

```json
{
  "title": "便携榨汁杯",
  "category": "厨房小家电",
  "sellingPoints": ["便携", "易清洗", "适合健身和通勤"],
  "targetAudience": "上班族、健身人群、学生",
  "usageScene": "办公室、健身房、旅行途中"
}
```

响应：

```json
{
  "success": true,
  "data": {
    "id": "product_001",
    "title": "便携榨汁杯",
    "category": "厨房小家电",
    "sellingPoints": ["便携", "易清洗", "适合健身和通勤"],
    "targetAudience": "上班族、健身人群、学生",
    "usageScene": "办公室、健身房、旅行途中",
    "createdAt": "2026-05-21T00:00:00.000Z"
  }
}
```

### 生成 CreativePlan

请求：

```json
{
  "style": "pain_point",
  "language": "zh-CN",
  "maxDuration": 15,
  "merchantAdCopy": "30 秒打一杯新鲜果汁"
}
```

响应：

```json
{
  "success": true,
  "data": {
    "id": "plan_001",
    "productId": "product_001",
    "status": "draft",
    "style": "pain_point",
    "title": "早八也能喝到新鲜果汁",
    "hook": "早上来不及吃水果？",
    "adCopy": "30 秒打一杯新鲜果汁，通勤也能随身带走。",
    "cta": "点击了解便携榨汁杯，让新鲜随身走。",
    "visualBible": {
      "aspectRatio": "9:16",
      "style": "TikTok 快节奏电商广告",
      "colorTone": "明亮清爽",
      "lighting": "柔和日光",
      "cameraStyle": "手持近景 + 商品特写",
      "productAppearance": "白色便携榨汁杯，透明杯身",
      "mainScenes": ["早晨厨房", "办公室桌面"],
      "continuityRules": ["每个分镜保持同一商品外观", "整体色调保持明亮清爽"]
    },
    "complianceWarnings": [],
    "continuityWarnings": [],
    "createdAt": "2026-05-21T00:00:00.000Z",
    "scenes": [
      {
        "id": "scene_001",
        "creativePlanId": "plan_001",
        "order": 1,
        "duration": 3,
        "visualDescription": "上班族匆忙出门，桌上水果来不及吃",
        "subtitle": "早上来不及吃水果？",
        "voiceover": "早上来不及吃水果？",
        "materialId": "material_001",
        "seedancePrompt": "9:16 TikTok style commercial, bright morning kitchen, young office worker rushing out, white portable blender cup with transparent body on table, fresh fruits beside it, clean daylight",
        "warnings": [],
        "transition": "zoom"
      }
    ]
  }
}
```

### 创建视频生成任务

请求：

```json
{
  "provider": "seedance_1_5",
  "aspectRatio": "9:16",
  "withTts": true,
  "withBgm": true,
  "fallbackToFfmpeg": true
}
```

响应：

```json
{
  "success": true,
  "data": {
    "id": "task_001",
    "productId": "product_001",
    "creativePlanId": "plan_001",
    "provider": "seedance_1_5",
    "status": "pending",
    "progress": 0,
    "currentStep": "任务已创建",
    "logs": [],
    "createdAt": "2026-05-21T00:00:00.000Z",
    "updatedAt": "2026-05-21T00:00:00.000Z"
  }
}
```

### 查询任务

响应：

```json
{
  "success": true,
  "data": {
    "id": "task_001",
    "productId": "product_001",
    "creativePlanId": "plan_001",
    "provider": "seedance_1_5",
    "status": "running",
    "progress": 60,
    "currentStep": "正在合成分镜片段",
    "logs": [
      {
        "id": "log_001",
        "level": "info",
        "message": "已生成字幕文件",
        "timestamp": "2026-05-21T00:01:00.000Z"
      }
    ],
    "createdAt": "2026-05-21T00:00:00.000Z",
    "updatedAt": "2026-05-21T00:01:00.000Z"
  }
}
```

---

## 6. 任务进度约定

| progress | currentStep |
| --- | --- |
| 0 | 任务已创建 |
| 10 | 读取 CreativePlan 和素材 |
| 25 | Seedance 1.5 生成分镜片段 |
| 40 | 生成字幕和准备配音 |
| 60 | FFmpeg 后处理 |
| 80 | 拼接视频与 BGM |
| 95 | 导出 mp4 |
| 100 | 生成完成 |

失败时：

```json
{
  "status": "failed",
  "progress": 60,
  "currentStep": "合成分镜片段失败",
  "errorMessage": "素材文件不存在：uploads/material_001.png"
}
```

---

## 7. Day 1 统一命名规则

- 路径使用复数：`products`、`materials`、`creative-plans`、`tasks`。
- TypeScript 类型使用 PascalCase。
- 字段使用 camelCase。
- 数据库模型使用单数：`Product`、`Material`、`Script`。
- 文件目录使用小写复数。
- 不要使用拼音字段名。

---

## 8. Day 2 最小开发目标

Day 2 开始写代码时，优先完成：

1. 前端创建商品页。
2. 后端 `POST /api/products` 和 `GET /api/products`。
3. MySQL/Prisma 初始化。
4. Redis/BullMQ 队列初始化。
5. 前端使用真实接口创建商品。
6. 准备 Demo 商品素材目录。

完成这些事后，再进入素材上传链路。
