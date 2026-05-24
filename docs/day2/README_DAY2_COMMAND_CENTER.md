# Day 2 总控文档：integration 基线稳定与真实联调

> 基线分支：`codex/integrate-ai-video`  
> Day 2 DDL：`2026-05-24 12:00`，Asia/Shanghai  
> 总目标：不要重做 Day 1。基于已经跑通的 `generate -> approve -> render -> get task` 链路，补齐前端真实 API、Materials/Analytics 缺口、FFmpeg 验证，以及 Prisma/BullMQ 后续迁移边界。

---

## 1. 当前真实状态

`codex/integrate-ai-video` 已经完成：

- 基于最新 `origin/main`，并合入 `feature/ai-creative-plan`。
- API build 通过，Web build 通过。
- 已接通 `creative-plan` 路由和 `render` 路由。
- 已实现 `MockAiProvider`、`ComplianceAgent`、`ContinuityAgent`。
- 已实现 Seedance 1.5 fail-fast 占位，以及 FFmpeg fallback provider。
- 已实现临时内存存储：
  - `planStore`
  - `taskStore`
  - `taskMaterialsStore`
- 已验证 API 链路：
  - `GET /api/health`
  - `POST /api/products/product_001/creative-plans/generate`
  - `GET /api/products/product_001/creative-plans`
  - `POST /api/creative-plans/:id/approve`
  - `POST /api/creative-plans/:id/render`
  - `GET /api/tasks/:id`
- 当前 render 最终 `failed` 的主要原因是本机没有可用 FFmpeg。接口链路本身已经通。

---

## 2. Day 2 不再重复做什么

请所有 agent 注意，不要重复做这些已完成事项：

- 不要重新设计 `CreativePlan` / `Scene` / `VisualBible` 类型。
- 不要重新写 `MockAiProvider`。
- 不要重新接 `creative-plan` routes。
- 不要重新接 `render` routes。
- 不要修改现有 API 路径。
- 不要直接从 `main` 另开一条不兼容路线。
- 不要为了“更干净”删掉 memory store，除非 Prisma 迁移已经完整可跑。

---

## 3. Day 2 P0 目标

Day 2 的 P0 是让项目从“接口链路通”推进到“前后端真实联调可演示”：

1. 全员从 `codex/integrate-ai-video` 继续开发。
2. 后端补齐前端已经调用但缺失的接口：
   - `GET /api/products/:id/materials`
   - `GET /api/analytics/overview`
3. 前端关闭 mock 后能跑真实 API：
   - `VITE_USE_MOCK=false`
   - `VITE_API_BASE_URL=http://localhost:3101/api`
4. 前端审核页必须展示真实 CreativePlan，并支持用户确认前查看和编辑关键内容。
5. 前端任务页必须展示 render 进度、步骤、日志、失败原因，不能因为 FFmpeg 缺失白屏。
6. AI/视频模块验证 FFmpeg 环境；如果可安装，尽量让 fallback 真实输出 mp4；如果不可安装，错误原因和安装说明必须清楚。

---

## 4. 三个 Agent 分工

| Agent | 当前基础 | Day 2 重点 |
| --- | --- | --- |
| Agent A 前端 | 页面和 service 已存在，默认 `USE_MOCK=true` | 真实 API 模式、审核页增强、任务进度体验、失败态展示 |
| Agent B 后端 | Products / CreativePlan / render 已可用 | 补 Materials / Analytics API，保持链路不坏，规划 Prisma/BullMQ 迁移 |
| Agent C AI/视频 | Mock/审查/Seedance fail-fast/FFmpeg provider 已存在 | 验证 FFmpeg，争取 fallback 真出 mp4，完善失败原因和安装说明 |

---

## 5. 分支同步方式

所有人先执行：

```bash
git fetch origin
git checkout codex/integrate-ai-video
git pull origin codex/integrate-ai-video
```

如果从自己的功能分支继续：

```bash
git fetch origin
git checkout feature/your-branch
git merge origin/codex/integrate-ai-video
```

建议每个人从 integration 分支再开自己的 Day 2 分支：

```bash
git checkout -b feature/day2-frontend-real-api
git checkout -b feature/day2-backend-missing-api
git checkout -b feature/day2-video-fallback
```

---

## 6. Day 2 最终验收链路

后端 API 验收：

```text
GET /api/health
GET /api/products/product_001/materials
GET /api/analytics/overview
POST /api/products/product_001/creative-plans/generate
GET /api/products/product_001/creative-plans
GET /api/creative-plans/:id
PUT /api/creative-plans/:id/scenes/:sceneId
POST /api/creative-plans/:id/approve
POST /api/creative-plans/:id/render
GET /api/tasks/:id
```

前端真实 API 验收：

```env
VITE_USE_MOCK=false
VITE_API_BASE_URL=http://localhost:3101/api
```

页面能完成：

```text
生成 CreativePlan
-> 查看 title/hook/adCopy/cta/visualBible/warnings/scenes
-> 编辑并保存至少一个 scene 字段
-> approve
-> render
-> 查看 task status/progress/currentStep/logs/errorMessage
```

视频验收：

- 有 FFmpeg：fallback 能输出 mp4，`GET /api/tasks/:id` 返回 `success` 和 `outputVideoUrl`。
- 无 FFmpeg：任务允许 `failed`，但 `errorMessage` 和 `logs` 必须说明原因，并提供安装说明。

---

## 7. Day 2 不做事项

- 不强制接真实 Seedance API，除非 fallback 已稳定。
- 不做登录注册。
- 不做 A/B 测试、Prompt 市场、真实投放数据。
- 不强制做 TTS/BGM，先保证字幕版视频兜底。
- 不直接合 `main`。

---

## 8. 是否可以进入 dev

可以开 PR 到 `dev` 的条件：

- API build 通过。
- Web build 通过。
- Materials API 和 Analytics API 至少有 mock/空数据实现。
- 前端真实 API 模式可用。
- `generate -> approve -> render -> get task` 链路仍通。
- FFmpeg 状态清楚：已出片，或已记录安装/失败原因。

暂不建议进 `main`，因为：

- CreativePlan/render 仍是 memory store。
- BullMQ 和 RenderService 尚未统一。
- Seedance 真实 API 尚未接入。

---

## 9. 给总控 Agent 的提示词

```text
你是 Day 2 集成总控 Agent。
当前分支 codex/integrate-ai-video 已经跑通 generate -> approve -> render -> get task。
请不要重做 Day 1 模块，也不要修改现有 API 路径。

请检查：
1. 前端是否能用 VITE_USE_MOCK=false 调真实 API；
2. Materials API 是否补齐；
3. Analytics overview 是否补齐；
4. CreativePlan 审核页是否展示 title/hook/adCopy/cta/visualBible/warnings/scenes；
5. TaskPage 是否展示 status/progress/currentStep/logs/errorMessage；
6. FFmpeg fallback 是否能出 mp4，或是否有清晰安装/失败说明；
7. Prisma/BullMQ 迁移是否有明确边界，且没有破坏 memory 链路；
8. 是否仍符合 docs/day1/SHARED_CONTRACT_DAY1.md。

输出：
- P0 阻塞；
- 各 Agent 完成情况；
- 验收命令；
- 是否可以 PR 到 dev；
- 为什么暂不建议进 main。
```
