# Day 5 总控文档：双审核流程与多 Agent 契约定型

> 当前共同基线：`origin/codex/integrate-ai-video`
> 基线 HEAD：`d19fda3 fix: stabilize day5 baseline integration`
> 备份分支：`origin/codex/day5-baseline`
> Day 5 目标：在不破坏 Day4 分镜剪辑台和 Seedance/FFmpeg 双链路的前提下，定型最终版本的双审核、多 Agent、预留字段/API 方案，并完成最小可运行改造。

---

## 1. 当前基线状态

当前已经具备：

- 前端分镜剪辑台可用。
- 支持调整 scene 顺序。
- 支持编辑 `duration / transition / subtitle / voiceover / seedancePrompt`。
- 支持保存剪辑。
- 审核前、render 前会自动保存。
- 素材上传已恢复真实上传。
- Seedance prompt 已结构化。
- 有 `SEEDANCE_API_KEY` 时优先提交 Seedance 任务。
- 无 Key / Seedance 失败 / 超时 / 无 videoUrl 时走 FFmpeg fallback。
- API build 通过。
- Web build 通过。
- 密钥未泄露。

当前必须保护的主链路：

```text
generate CreativePlan
-> 编辑 / 调整 scenes
-> 保存剪辑
-> approve
-> render
-> get task
```

---

## 2. Day 5 总体方向

Day 5 不做后端大重写，不做破坏性迁移。

Day 5 聚焦三件事：

1. **双审核流程规划与最小落地**
   - 第一次审核：创意策略审核。
   - 第二次审核：分镜方案审核。
   - 用户确认后才生成视频。

2. **多 Agent Pipeline 最小落地**
   - 多 Agent 是 AI 内部 pipeline。
   - 前端和后端 API 不直接感知每个 Agent。
   - 最终仍输出 `CreativePlan`。

3. **最终字段/API 契约预留**
   - 预留 `CreativeStrategy`。
   - 预留 `Scene.goal / materialUsage / previewVideoUrl`。
   - 预留 `AgentTrace`。
   - 预留 `renderMode: full_video | scene_clips`。
   - 预留 scene-level render / preview 的未来接口。

---

## 3. Day 5 不做什么

- 不直接重写后端 routes。
- 不注释掉已有 `materials/render/analytics/creative-plans` 路由。
- 不半迁移 BullMQ/Prisma render 链路。
- 不删除 memory fallback。
- 不强制把 CreativePlan 生成改成异步 task。
- 不强制实现 scene-level 视频预览。
- 不强制实现对象存储。
- 不把每个 Agent 的完整输出都返回给前端。
- 不保存真实 API Key、`.env`、headers 或模型完整敏感上下文。

---

## 4. 三个 Agent 分工

| Agent | 建议分支 | Day 5 重点 |
| --- | --- | --- |
| Agent A 前端 | `feature/day5-frontend-review-flow` | 双审核 UI 方案、策略审核页/区块、CreativePlan 字段适配、进度展示设计 |
| Agent B 后端 | `feature/day5-contract-and-persistence` | 预留类型/API/Prisma 方案，保持现有链路，补最小契约和安全校验 |
| Agent C AI/视频 | `feature/day5-multi-agent-pipeline` | CreativePlanPipeline、多 Agent JSON 输出、VisualBible 注入、AgentTrace 摘要 |

---

## 5. Day 5 P0

### P0.1 契约冻结

所有人必须同意：

```text
AI 内部可以复杂；
前后端共同契约必须稳定；
最终仍以 CreativePlan 给前端展示和编辑。
```

### P0.2 多 Agent 最小实现

AI 模块新增 `CreativePlanPipeline`，但外部 API 不变：

```text
POST /api/products/:productId/creative-plans/generate
```

返回仍是：

```text
CreativePlan
```

### P0.3 双审核最小设计

最终流程确定为：

```text
策略生成 -> 用户审核策略
分镜生成 -> 用户审核/剪辑分镜
视频生成 -> 用户预览
```

Day5 可以先以文档和类型预留为主，不强制拆成完整新页面。

### P0.4 主链路不坏

必须继续通过：

```text
generate -> save scenes -> approve -> render -> get task
```

---

## 6. Day 5 P1

- 前端展示 `scene.goal`，如果字段存在。
- 前端预留策略审核区块。
- 后端预留 `CreativeStrategy` 类型或文档。
- 后端预留 `Task.type` / `renderMode`。
- AI 输出 `agentTrace` 摘要。
- RevisionAgent 自动修一轮低风险问题。
- 生成进度条设计：CreativePlan 生成进度 + Render 进度。

---

## 7. Day 5 P2

- 真正新增 CreativeStrategy API。
- CreativePlan 生成异步任务化。
- scene-level render API 实现。
- SceneRenderAsset 表和前端预览。
- 图片 base64 / 视频抽帧传 Seedance。
- 远端 Seedance videoUrl 下载到 `/outputs`。

---

## 8. 推荐最终流程

```text
商品信息 + 商户广告词 + 素材
-> Product Analyst
-> Material Analyst / Selector
-> Creative Strategy
-> 用户审核策略
-> Visual Bible
-> Script
-> Storyboard
-> Seedance Prompt
-> Compliance
-> Continuity
-> Revision
-> CreativePlan
-> 用户审核/分镜剪辑
-> RenderStrategy
-> Seedance 1.5 / FFmpeg fallback
-> 最终视频
```

---

## 9. Day 5 验收

必须通过：

```bash
npm.cmd --prefix apps/api run build
npm.cmd --prefix apps/web run build
git diff --check
```

必须保护：

```text
POST /api/products/product_001/creative-plans/generate
PUT /api/creative-plans/:id
POST /api/creative-plans/:id/approve
POST /api/creative-plans/:id/render
GET /api/tasks/:id
```

不能合并的 P0：

- API 路由被删除或改名。
- Web/API build 失败。
- 剪辑台保存后 scenes 丢失。
- render 不读取保存后的 scenes。
- Seedance/fallback 双链路被破坏。
- 真实密钥泄露。
