# Agent A Frontend Day 1 Delivery

## 1. 前端页面结构

前端入口位于 `apps/web`，使用 React + TypeScript + Vite + Ant Design + React Router。Day 1 目标不是完整生产 UI，而是让 MVP 主链路有清晰页面骨架、Mock 数据、组件边界和 API 对齐点。

核心链路：

```text
工作台
-> 创建商品
-> 素材库
-> 生成创意方案
-> 方案审核 / 分镜编辑
-> 确认生成视频
-> 任务进度
-> 视频预览 / 下载
-> 数据看板
```

视觉方向参考即梦：深色沉浸式创作台、强素材预览、Prompt 输入感、视频生成标签和高对比主操作按钮。这里没有做营销首页，而是把这种视觉语言压进商家工作台。

## 2. 路由表

| 路由 | 页面 | Day 1 内容 |
| --- | --- | --- |
| `/` | 工作台 | 商品项目列表、最近生成任务、创建入口、Prompt 创作台视觉 |
| `/products/new` | 创建商品 | 标题、类目、卖点、目标人群、使用场景 |
| `/products/:productId/materials` | 素材库 | 图片/视频上传区、素材卡片、标签、AI 描述 |
| `/products/:productId/creative-plan` | 创意方案生成 | 风格模板、商家广告诉求、生成按钮 |
| `/creative-plans/:planId/review` | 方案审核 / 分镜编辑器 | Hook、广告词、CTA、Visual Bible、合规提示、分镜卡片、Seedance Prompt 编辑 |
| `/tasks/:taskId` | 任务进度 | 进度条、步骤时间线、任务日志、失败信息、成功跳转 |
| `/videos/:videoId` | 视频预览 | 播放器、下载按钮、基础指标、优化建议 |
| `/analytics` | 数据看板 | 播放、点击、转化、完播、趋势图、A/B 对比 |

## 3. 组件清单与职责

| 组件 | 路径 | 职责 |
| --- | --- | --- |
| `ProductForm` | `apps/web/src/components/ProductForm.tsx` | 创建商品表单，对齐 `POST /api/products` |
| `MaterialUploader` | `apps/web/src/components/MaterialUploader.tsx` | 图片/视频上传入口，对齐 `POST /api/products/:id/materials` |
| `MaterialCard` | `apps/web/src/components/MaterialCard.tsx` | 素材缩略图、类型、标签、AI 描述 |
| `StyleTemplateSelector` | `apps/web/src/components/StyleTemplateSelector.tsx` | 五类脚本风格选择 |
| `ScriptResultPanel` | `apps/web/src/components/ScriptResultPanel.tsx` | 展示标题、Hook、广告词、CTA |
| `CreativePlanReviewPanel` | `apps/web/src/components/CreativePlanReviewPanel.tsx` | 方案审核主容器，串联脚本、Visual Bible、警告、分镜编辑和确认生成 |
| `VisualBiblePanel` | `apps/web/src/components/VisualBiblePanel.tsx` | 展示画幅、风格、色调、镜头、连续性规则 |
| `SceneCard` | `apps/web/src/components/SceneCard.tsx` | 分镜列表卡片，展示时长、素材、字幕、风险提示 |
| `SceneEditorPanel` | `apps/web/src/components/SceneEditorPanel.tsx` | 编辑画面描述、字幕、旁白、时长、素材、Seedance Prompt |
| `ComplianceWarningList` | `apps/web/src/components/ComplianceWarningList.tsx` | 合规与连续性提示 |
| `TaskProgressTimeline` | `apps/web/src/components/TaskProgressTimeline.tsx` | 排队、读取方案、Seedance、配音字幕、FFmpeg、完成 |
| `TaskLogList` | `apps/web/src/components/TaskLogList.tsx` | 任务日志列表 |
| `VideoPreviewPlayer` | `apps/web/src/components/VideoPreviewPlayer.tsx` | 成片播放和下载入口 |
| `AnalyticsMetricCard` | `apps/web/src/components/AnalyticsMetricCard.tsx` | 数据指标卡 |
| `AbTestCompareChart` | `apps/web/src/components/AbTestCompareChart.tsx` | A/B 对比图 |

## 4. Mock 数据

Mock 数据位于：

```text
apps/web/src/data/mockData.ts
```

已包含：

- 2 个商品：便携榨汁杯、旅行收纳包
- 每个商品 3 个素材
- 1 个 CreativePlan
- 4 个分镜
- 1 个成功任务
- 1 个失败任务
- 1 组数据看板与 A/B 对比数据

共享类型位于：

```text
packages/shared/src/types.ts
```

字段命名与 `docs/day1/SHARED_CONTRACT_DAY1.md` 保持一致，前端没有新增中文拼音字段。

## 5. API 对齐计划

前端 service 层位于：

```text
apps/web/src/services/api.ts
```

默认使用 Mock。后端就绪后设置：

```env
VITE_USE_MOCK=false
VITE_API_BASE_URL=/api
```

需要后端提供的接口：

| 方法 | 路径 | 前端使用场景 |
| --- | --- | --- |
| `POST` | `/api/products` | 创建商品 |
| `GET` | `/api/products` | 工作台商品列表 |
| `GET` | `/api/products/:id` | 页面详情补全 |
| `PUT` | `/api/products/:id` | 后续商品编辑 |
| `POST` | `/api/products/:id/materials` | 上传图片/视频 |
| `GET` | `/api/products/:id/materials` | 素材库与分镜绑定素材 |
| `PUT` | `/api/materials/:id` | 编辑标签/描述 |
| `DELETE` | `/api/materials/:id` | 删除素材 |
| `POST` | `/api/products/:id/creative-plans/generate` | 生成 CreativePlan |
| `GET` | `/api/products/:id/creative-plans` | 商品下方案列表 |
| `GET` | `/api/creative-plans/:id` | 审核页详情 |
| `PUT` | `/api/creative-plans/:id` | 修改 Hook、广告词、CTA、Visual Bible |
| `POST` | `/api/creative-plans/:id/approve` | 用户确认方案 |
| `PUT` | `/api/creative-plans/:id/scenes/:sceneId` | 保存分镜编辑 |
| `POST` | `/api/creative-plans/:id/scenes/:sceneId/regenerate` | 单分镜重生成 |
| `POST` | `/api/creative-plans/:id/render` | 创建视频生成任务 |
| `GET` | `/api/tasks/:id` | 查询进度 |
| `POST` | `/api/tasks/:id/retry` | 失败重试 |
| `GET` | `/api/analytics/overview` | 数据看板 |
| `GET` | `/api/analytics/videos/:videoId` | 单视频表现 |
| `GET` | `/api/analytics/ab-tests` | A/B 对比 |

## 6. Day 2 前端任务

1. 接入后端 `POST /api/products` 和 `GET /api/products`，让创建商品走真实接口。
2. 将素材上传从 Mock 改为 `FormData`，对接 `POST /api/products/:id/materials`。
3. 给页面补齐 Loading、空状态和接口错误提示。
4. 在审核页支持保存 CreativePlan 顶层字段：Hook、广告词、CTA、Visual Bible。
5. 分镜编辑接入真实 `PUT /api/creative-plans/:id/scenes/:sceneId`。
6. 任务页改为轮询 `GET /api/tasks/:id`，如果后端提供 SSE 再切到 `/events`。
7. 为演示录屏准备固定入口：工作台 -> 榨汁杯素材库 -> 方案审核 -> 任务成功 -> 视频预览。

## 7. 验收问题回答

- 用户从 `/products/new` 创建商品，也可以从工作台主按钮进入。
- 素材上传后在 `/products/:productId/materials` 查看。
- 创意方案、广告词、合规提示和 Seedance Prompt 在 `/creative-plans/:planId/review` 展示。
- 分镜在审核页左侧 `SceneCard` 列表选择，右侧 `SceneEditorPanel` 编辑和确认。
- 用户确认生成后跳转 `/tasks/:taskId` 查看进度。
- 成片在 `/videos/:videoId` 播放和下载。
- 后端未完成时，`apps/web/src/services/api.ts` 默认使用 `apps/web/src/data/mockData.ts`，前端可继续独立开发。
