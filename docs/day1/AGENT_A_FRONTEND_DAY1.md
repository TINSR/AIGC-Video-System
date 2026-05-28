# Agent A Day 1 任务书：前端与交互

> 角色：前端 Agent  
> 负责范围：React 页面、路由、组件、Mock 数据、交互流程  
> 不负责：后端数据库实现、真实 AI 调用、FFmpeg 命令

---

## 1. 你的目标

你要为“电商场景 AIGC 带货视频生成系统”设计第一版前端骨架。这个系统面向商家，核心路径是：

```text
创建商品 -> 上传素材 -> 生成创意方案 -> 审核广告词/分镜/Seedance Prompt -> 确认生成视频 -> 查看进度 -> 预览导出
```

Day 1 不要求你写完整 UI，但必须产出清晰的页面结构、组件拆分、Mock 数据和接口调用计划，让 Day 2 可以直接开始写代码。

---

## 2. 推荐技术栈

- React
- TypeScript
- Vite
- Ant Design
- React Router
- ECharts，后续数据看板使用

不要引入复杂状态管理。第一版可以用 React Query 或普通 service 封装 API。

---

## 3. 页面规划

请按下面页面设计：

| 页面 | 路径 | Day 1 需要设计的内容 |
| --- | --- | --- |
| 工作台 | `/` | 商品项目列表、最近生成视频、创建入口 |
| 创建商品 | `/products/new` | 商品标题、类目、卖点、目标人群、使用场景 |
| 素材库 | `/products/:productId/materials` | 上传区、素材卡片、标签编辑 |
| 创意方案生成 | `/products/:productId/creative-plan` | 风格模板、商户广告诉求、生成方案按钮 |
| 方案审核/分镜编辑器 | `/creative-plans/:planId/review` | 广告词、Hook、CTA、Visual Bible、合规提示、分镜卡片、Seedance Prompt 编辑 |
| 任务进度 | `/tasks/:taskId` | 步骤进度、日志、失败重试、成功跳转 |
| 视频预览 | `/videos/:videoId` | 播放器、下载按钮、基础指标 |
| 数据看板 | `/analytics` | Mock 播放、点击、转化、A/B 对比 |

---

## 4. 核心组件拆分

请至少设计这些组件：

```text
ProductForm
MaterialUploader
MaterialCard
StyleTemplateSelector
ScriptResultPanel
CreativePlanReviewPanel
VisualBiblePanel
SceneCard
SceneEditorPanel
ComplianceWarningList
TaskProgressTimeline
TaskLogList
VideoPreviewPlayer
AnalyticsMetricCard
AbTestCompareChart
```

组件设计重点：

- `CreativePlanReviewPanel` 和 `SceneCard` 是最关键组件，后续演示“生成前审核”和“分镜级干预”要靠它。
- `TaskProgressTimeline` 要能展示排队、读取 CreativePlan、Seedance 生成片段、生成配音、FFmpeg 后处理、完成。
- `MaterialUploader` 第一版只需要支持图片和视频。

---

## 5. 前端共享类型草案

请在前端使用以下类型，后续与 `packages/shared` 对齐：

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
  style: "pain_point" | "review" | "scenario" | "discount" | "premium";
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

export type GenerationTask = {
  id: string;
  productId: string;
  creativePlanId: string;
  status: "pending" | "running" | "success" | "failed";
  progress: number;
  currentStep: string;
  logs: TaskLog[];
  outputVideoUrl?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
};

export type TaskLog = {
  id: string;
  level: "info" | "warn" | "error";
  message: string;
  timestamp: string;
};
```

---

## 6. Mock 数据要求

Day 1 请准备至少：

- 2 个商品。
- 每个商品 3 个素材。
- 1 个剧本。
- 1 个 CreativePlan。
- 每个 CreativePlan 4 个分镜。
- 1 个成功任务。
- 1 个失败任务。
- 1 组看板数据。

推荐 Demo 商品：

1. 便携榨汁杯。
2. 旅行收纳包。

---

## 7. Day 1 交付物

你最终需要输出：

1. 前端页面结构说明。
2. 路由表。
3. 组件清单和组件职责。
4. Mock 数据 JSON 或 TypeScript 文件。
5. 前端需要后端提供的 API 清单，重点包括 CreativePlan 生成、保存、确认、渲染。
6. Day 2 前端开发任务。

---

## 8. 验收标准

你的输出必须能回答：

- 用户从哪里创建商品？
- 素材上传后在哪里看？
- 创意方案、广告词、合规提示和 Seedance Prompt 如何展示？
- 分镜在哪里编辑和确认？
- 用户确认生成视频后进度在哪里看？
- 生成视频在哪里播放和下载？
- 如果后端暂时没完成，前端如何用 Mock 数据继续开发？

---

## 9. 禁止事项

- 不要设计复杂专业剪辑器。
- 不要做登录注册作为第一天重点。
- 不要引入过多 UI 动画。
- 不要依赖真实 AI 接口才能展示页面。
- 不要把数据字段命名成中文拼音，统一使用英文 camelCase。
