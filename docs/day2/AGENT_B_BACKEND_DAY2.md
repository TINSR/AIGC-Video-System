# Agent B Day 2 任务书：补齐缺口 API 与规划持久化

> 角色：后端 Agent
> 基线分支：`codex/integrate-ai-video`
> 目标：不要重做已经跑通的 CreativePlan/render 链路。集中补 Materials/Analytics 缺口，并给 Prisma/BullMQ 迁移一个可执行边界。

---

## 1. 当前后端状态

已经可用：

- `GET /api/health`
- Products API
- CreativePlan API
- Render API
- memory store：
  - `planStore`
  - `taskStore`
  - `taskMaterialsStore`
- API build 通过。
- `generate -> list -> get -> approve -> render -> get task` 已验证。

当前缺口：

- Materials API 尚未实现，但前端调用 `GET /api/products/:id/materials`。
- Analytics API 尚未实现，但前端调用 `GET /api/analytics/overview`。
- CreativePlan/render 仍未迁到 Prisma。
- `renderWorker.ts` 与新的 `RenderService` 尚未统一。

---

## 2. P0 任务：补 Materials API

前端已经调用：

```text
GET /api/products/:id/materials
```

Day 2 最低要求：

```text
GET /api/products/:id/materials
```

必须可用，并返回符合共享契约的 `Material[]`。

最低可接受实现：

- 先用 memory/demo materials。
- 不阻塞前端联调。
- 返回字段严格符合共享类型：
  - `id`
  - `productId`
  - `type`
  - `fileUrl`
  - `thumbnailUrl`，可选
  - `title`
  - `tags`
  - `aiDescription`，可选
  - `duration`，可选
  - `createdAt`

如果时间充足，再补：

```text
POST /api/products/:id/materials
PUT /api/materials/:id
DELETE /api/materials/:id
```

---

## 3. P0 任务：补 Analytics overview

前端已经调用：

```text
GET /api/analytics/overview
```

Day 2 最低要求：

- 返回 mock overview。
- 不让 `AnalyticsPage` 报错。
- 字段以当前共享类型 `AnalyticsOverview` 为准。
- 可以从 memory store 粗略统计：
  - 商品数
  - CreativePlan 数
  - 任务数
  - 成功/失败任务数

---

## 4. P0 任务：保持现有链路不坏

改动后必须继续可用：

```text
POST /api/products/product_001/creative-plans/generate
GET /api/products/product_001/creative-plans
GET /api/creative-plans/:id
PUT /api/creative-plans/:id
PUT /api/creative-plans/:id/scenes/:sceneId
POST /api/creative-plans/:id/approve
POST /api/creative-plans/:id/render
GET /api/tasks/:id
POST /api/tasks/:id/retry
```

特别注意：

- `render` 仍要求 plan 已 approved。
- render 失败时要返回清晰 `errorMessage` 和 `logs`。
- 不要把 render 改成依赖真实 Seedance。

---

## 5. P1 任务：Prisma 迁移方案

当前不要半迁移导致链路断裂。

请至少输出一份明确方案：

```text
第一步：CreativePlan / Scene 迁到 Prisma
第二步：GenerationTask / TaskLog 迁到 Prisma
第三步：Materials 迁到 Prisma
第四步：移除 memory store
```

如果当天能实现，优先迁：

```text
CreativePlan + Scene
```

但必须保证：

```text
generate -> list -> get -> approve -> render -> get task
```

仍然可跑。

---

## 6. P1 任务：BullMQ 与 RenderService 边界

当前存在两套逻辑：

```text
main 原有 renderWorker.ts
新的 RenderService / FFmpegComposeProvider
```

Day 2 至少要做到以下之一：

- 文档说明 Day 2 仍以 `RenderService + memory task` 为主链路；
- 或把 BullMQ worker 接到新的 `RenderService/FFmpegComposeProvider`；
- 不允许同一个 render API 同时触发两套任务执行逻辑。

---

## 7. 禁止事项

- 不要修改现有 API 路径。
- 不要破坏 CreativePlan/render 链路。
- 不要删除 memory store，除非 Prisma 完整替代。
- 不要让 render 依赖真实 Seedance。
- 不要直接合 `main`。

---

## 8. 验收标准

- [ ] `npm --prefix apps/api run db:generate` 通过。
- [ ] `npm --prefix apps/api run build` 通过。
- [ ] `GET /api/products/product_001/materials` 可用。
- [ ] `GET /api/analytics/overview` 可用。
- [ ] CreativePlan generate/list/get/update/approve 仍可用。
- [ ] render/get task/retry 仍可用。
- [ ] render failed 时 `errorMessage` 和 `logs` 清楚。
- [ ] 如果未迁 Prisma，说明 memory store 临时范围和迁移计划。
- [ ] 如果未整合 BullMQ，说明当前任务执行主链路。

---

## 9. 给后端 Coding Agent 的提示词

```text
你是后端 Agent，请基于 codex/integrate-ai-video 分支继续。
注意：CreativePlan/render memory 链路已经可用，不要重做。

任务：
1. 补 GET /api/products/:id/materials，至少返回符合共享类型的 Material[]；
2. 补 GET /api/analytics/overview，至少返回 mock overview；
3. 保持 generate -> approve -> render -> get task 链路不坏；
4. render failed 时必须有清晰 errorMessage/logs；
5. 输出 Prisma 迁移方案，能做则优先迁 CreativePlan/Scene；
6. 梳理 renderWorker 与 RenderService 的关系，不要双链路触发。

所有字段遵守 docs/day1/SHARED_CONTRACT_DAY1.md。
完成后输出改动文件、验证命令、接口结果、仍未解决的技术债。
```
