# Agent A Day 2 任务书：前端真实 API 与审核体验增强

> 角色：前端 Agent
> 基线分支：`codex/integrate-ai-video`
> 目标：不要重做页面。基于现有前端，把 mock 页面推进到真实 API 可用，并把“生成前审核”做成比赛演示亮点。

---

## 1. 当前前端状态

已有页面：

- `DashboardPage`
- `ProductNewPage`
- `MaterialsPage`
- `CreativePlanPage`
- `ReviewPage`
- `TaskPage`
- `VideoPage`
- `AnalyticsPage`

前端 service 已经定义真实 API 路径，但默认仍是：

```text
USE_MOCK=true
```

真实 API 配置：

```env
VITE_USE_MOCK=false
VITE_API_BASE_URL=http://localhost:3101/api
```

注意：service 里的路径通常不带 `/api`，因为 `VITE_API_BASE_URL` 已经包含 `/api`。

---

## 2. P0 任务：真实 API 闭环

必须验证并修复真实 API 模式：

```text
生成 CreativePlan
-> 展示 CreativePlan
-> 编辑/保存 scene
-> approve
-> render
-> task polling
```

必须使用的接口：

```text
GET /products
POST /products
GET /products/:productId/materials
POST /products/:productId/creative-plans/generate
GET /creative-plans/:planId
PUT /creative-plans/:planId/scenes/:sceneId
POST /creative-plans/:planId/approve
POST /creative-plans/:planId/render
GET /tasks/:taskId
POST /tasks/:taskId/retry
GET /analytics/overview
```

如果后端某个接口当天刚补，前端要按共享类型适配，不要自创字段。

---

## 3. P0 任务：审核页必须像产品，而不是 JSON

`ReviewPage` / `CreativePlanPage` 必须体现“视频生成前给用户确认”的产品逻辑。

必须展示：

- `title`
- `hook`
- `adCopy`
- `cta`
- `visualBible`
- `warnings`
- `scenes`
- 每个 scene 的 `duration`
- 每个 scene 的 `visualDescription`
- 每个 scene 的 `subtitle`
- 每个 scene 的 `voiceover`
- 每个 scene 的 `seedancePrompt`
- 每个 scene 的 `transition`

必须支持编辑并保存至少这些字段：

- `subtitle`
- `voiceover`
- `duration`
- `seedancePrompt`

保存方式：

```text
PUT /creative-plans/:planId/scenes/:sceneId
```

交互要求：

- 保存中有 loading 状态。
- 保存成功有明确反馈。
- 保存失败有错误提示。
- 审核通过按钮调用 approve。
- approve 前不要触发 render。

---

## 4. P0 任务：任务进度页

`TaskPage` 必须展示：

- `status`
- `progress`
- `currentStep`
- `logs`
- `provider`
- `errorMessage`
- `outputVideoUrl`

轮询建议：

- 每 2 秒查询一次。
- `success` 或 `failed` 后停止轮询。
- `failed` 时显示清晰失败原因，例如 FFmpeg 不可用。
- 如果有 retry 按钮，调用 `POST /tasks/:taskId/retry`。

重点：render failed 是可以接受的，但页面白屏不接受。

---

## 5. P1 任务：Materials 与 Analytics 兼容

Materials：

- `GET /products/:productId/materials` 返回空数组时页面不能崩。
- 没有真实素材时，显示空状态。
- 如果返回 demo 素材，要能展示素材标题、类型、缩略图或占位图。

Analytics：

- `GET /analytics/overview` 暂时可以是 mock overview。
- 页面要能显示数据，或者优雅降级为空状态。

---

## 6. 禁止事项

- 不要修改后端 API 路径。
- 不要自创字段名。
- 不要删除 mock 模式。
- 不要把真实 API 地址写死在组件里。
- 不要因为 render failed 让页面白屏。

---

## 7. 验收标准

- [ ] `npm --prefix apps/web run build` 通过。
- [ ] `VITE_USE_MOCK=true` 仍可用。
- [ ] `VITE_USE_MOCK=false` 可调用 `localhost:3101/api`。
- [ ] CreativePlan 审核页能展示真实接口返回。
- [ ] 能保存至少一个 scene 修改。
- [ ] approve 可用。
- [ ] render 可用。
- [ ] task failed 时显示 `errorMessage`，不白屏。
- [ ] Materials 返回空数组时页面正常。
- [ ] Analytics mock/空数据时页面正常。

---

## 8. 给前端 Coding Agent 的提示词

```text
你是前端 Agent，请基于 codex/integrate-ai-video 分支继续。
当前项目已经有页面和真实 API service，但默认 USE_MOCK=true。
你的任务不是重做页面，而是：
1. 支持 VITE_USE_MOCK=false 调真实 API；
2. 让 CreativePlan 审核页展示真实接口返回；
3. 展示 title/hook/adCopy/cta/visualBible/warnings/scenes；
4. 支持编辑并保存至少 subtitle、voiceover、duration、seedancePrompt；
5. 让 TaskPage 展示 status/progress/currentStep/logs/errorMessage/outputVideoUrl；
6. 兼容 Materials 空数组和 Analytics mock/空数据；
7. 保留 mock 模式。

不要修改后端 API 路径，不要自创字段。
完成后输出改动文件、运行命令、联调结果，以及还存在的前端风险。
```
