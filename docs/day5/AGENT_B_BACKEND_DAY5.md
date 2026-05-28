# Agent B Day 5 任务书：最终契约预留与后端安全增量

> 角色：后端 Agent  
> 建议分支：`feature/day5-contract-and-persistence`  
> 基线：`origin/codex/integrate-ai-video`，HEAD `d19fda3`  
> 目标：预留最终版本需要的类型、字段和 API 设计，同时绝不破坏现有主链路。

---

## 1. 当前后端底线

当前后端主链路可用：

```text
generate CreativePlan
-> PUT /api/creative-plans/:id 保存 scenes
-> approve
-> render
-> get task
```

Day5 后端任务不是重写系统，而是增量预留。

---

## 2. P0：禁止破坏性改动

不要做：

- 不注释已有 routes。
- 不删除 `materials/render/analytics/creative-plans` 路由。
- 不改变已有 API 路径。
- 不半迁移 BullMQ/Prisma render 链路。
- 不删除 memory fallback。
- 不强行让 `DATABASE_URL` 缺失时 API 崩溃。

---

## 3. P0：预留最终共享类型

建议在 shared types 中以可选字段方式预留：

```ts
type SceneGoal = "full_demo" | "hook" | "feature" | "proof" | "cta";

type MaterialUsage =
  | "reference_image"
  | "source_clip"
  | "keyframe_reference"
  | "prompt_only";

type RenderMode = "full_video" | "scene_clips";

type AgentTrace = {
  agent: string;
  status: "success" | "warning" | "failed";
  summary: string;
  durationMs?: number;
  warnings?: string[];
};
```

在现有类型上预留：

```ts
Scene.goal?: SceneGoal;
Scene.materialUsage?: MaterialUsage;
Scene.negativePrompt?: string;
Scene.previewVideoUrl?: string;
Scene.renderStatus?: "idle" | "pending" | "running" | "success" | "failed";

CreativePlan.stage?: "strategy_review" | "storyboard_review" | "approved" | "rendering" | "rendered" | "failed";
CreativePlan.renderMode?: RenderMode;
CreativePlan.agentTrace?: AgentTrace[];
CreativePlan.strategyId?: string;
CreativePlan.version?: number;
CreativePlan.parentPlanId?: string;
```

注意：优先使用可选字段，避免立刻破坏前端。

---

## 4. P1：CreativeStrategy 设计

可以先加类型和文档，不强制落库：

```ts
type CreativeStrategy = {
  id: string;
  productId: string;
  status: "draft" | "approved" | "rejected";
  videoGoal: string;
  targetAudience: string;
  sellingPointOrder: string[];
  emotionalArc: string;
  styleDirection: string;
  recommendedSceneCount: number;
  warnings: string[];
  agentTrace?: AgentTrace[];
  createdAt: string;
  updatedAt: string;
};
```

最终 API 预留：

```text
POST /api/products/:productId/creative-strategies/generate
GET /api/creative-strategies/:id
POST /api/creative-strategies/:id/approve
POST /api/creative-strategies/:id/regenerate
POST /api/creative-strategies/:id/creative-plans/generate
```

Day5 可以先不实现全部 API，但要定下设计。

---

## 5. P1：数据库预留方案

最终建议新增：

```text
CreativeStrategy
RevisionHistory
SceneRenderAsset
GeneratedVideo
```

但 Day5 不建议一次性迁移。

Day5 最多做：

- Prisma schema 草案。
- 或文档说明。
- 或只使用 `CreativePlan.promptTrace Json?` 保存轻量 trace。

---

## 6. P1：任务进度预留

建议预留：

```ts
Task.type?: "creative_strategy" | "creative_plan" | "render" | "scene_render";
Task.resultId?: string;
Task.renderMode?: "full_video" | "scene_clips";
```

目前 render task 已经可用，不要重写。

---

## 7. 验收标准

- [ ] `npm.cmd --prefix apps/api run build` 通过。
- [ ] `git diff --check` 通过。
- [ ] 已有 routes 没有被删除或改名。
- [ ] generate/save/approve/render/get task 仍可用。
- [ ] 新字段尽量为 optional，不破坏前端。
- [ ] 没有提交密钥。
- [ ] 如果改 Prisma，必须 `db:generate` 通过。

