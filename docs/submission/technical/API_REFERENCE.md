# ClipShop AI API 清单

> 基础路径：`http://localhost:3001/api`
> 统一响应：`{ success: boolean, data?: T, error?: { code, message } }`

---

## Health

| Method | Path | 用途 | 参数 | 返回 |
|--------|------|------|------|------|
| GET | `/health` | 健康检查 | 无 | `{ status: "ok", timestamp }` |

---

## Products

| Method | Path | 用途 | 关键参数 | 常见错误 |
|--------|------|------|----------|----------|
| POST | `/products` | 创建商品 | `title, category, sellingPoints[], targetAudience, usageScene` | 400 校验失败 |
| GET | `/products` | 商品列表 | 无 | — |
| GET | `/products/:id` | 商品详情 | `id` | 404 |
| PUT | `/products/:id` | 更新商品 | 同创建字段 | 404 |

---

## Materials

| Method | Path | 用途 | 关键参数 | 返回 |
|--------|------|------|----------|------|
| GET | `/products/:productId/materials` | 素材列表 | `productId` | `Material[]` |
| POST | `/products/:productId/materials` | 上传素材 | `multipart file`, `type`, `title`, `tags` | `Material` |
| GET | `/products/:productId/materials/analyze-roles` | 素材角色分析 | `productId` | `MaterialRoleAnalysis[]` |
| PUT | `/products/:productId/materials/:materialId/primary` | 设为主图 | `materialId` | 更新后的素材 |
| GET | `/materials/:id` | 单条素材 | `id` | `Material` |
| PUT | `/materials/:id` | 更新素材 | `title, tags, ...` | `Material` |
| DELETE | `/materials/:id` | 删除素材 | `id` | success |

---

## MaterialClip（智能剪辑 - 素材切片）

| Method | Path | 用途 | 关键参数 | 常见错误 |
|--------|------|------|----------|----------|
| POST | `/products/:productId/material-clips/analyze` | 分析并持久化 clips | `{ force?: boolean }` | `NO_MATERIALS`, `NO_MATERIAL_CLIPS` |
| GET | `/products/:productId/material-clips` | 列出 clips | 无 | `MaterialClip[]` |

---

## CreativePlan

| Method | Path | 用途 | 关键参数 | 说明 |
|--------|------|------|----------|------|
| POST | `/products/:productId/creative-plans/generate` | 生成方案 | `style`, `templateId?`, `referenceVideoId?` | 含 agentTrace |
| GET | `/products/:productId/creative-plans` | 方案列表 | 无 | — |
| GET | `/creative-plans/:id` | 方案详情 | `id` | 含 scenes |
| PUT | `/creative-plans/:id` | 更新方案 | `title, hook, adCopy, cta, ...` | — |
| POST | `/creative-plans/:id/approve` | 审核通过 | 无 | status → approved |
| PUT | `/creative-plans/:id/scenes/:sceneId` | 更新单分镜 | `subtitle, voiceover, duration, seedancePrompt, ...` | — |
| PUT | `/creative-plans/:id/scenes` | 批量更新分镜 | `scenes[]` | — |
| POST | `/creative-plans/:id/scenes/:sceneId/regenerate` | 重新生成分镜 | `modifyRequest?` | — |
| POST | `/creative-plans/:id/scenes/:sceneId/render` | 分镜预览渲染 | 无 | scene preview mp4 |

---

## SmartEdit（智能剪辑 - 分镜匹配）

| Method | Path | 用途 | 关键参数 | 常见错误 |
|--------|------|------|----------|----------|
| POST | `/creative-plans/:id/smart-edit/plan` | 生成/更新剪辑计划 | `{ force?: boolean, overrides?: [{ sceneId, clipId }] }` | `NO_MATERIAL_CLIPS`, `SMART_EDIT_OVERRIDE_NOT_FOUND` |
| GET | `/creative-plans/:id/smart-edit/plan` | 获取已保存计划 | 无 | `SMART_EDIT_PLAN_NOT_FOUND` |

**成功返回 `SmartEditPlan`：**

```json
{
  "creativePlanId": "...",
  "decisions": [{
    "sceneId", "sceneOrder", "sceneGoal",
    "sceneSubtitle", "sceneDuration",
    "clip", "score", "reasons", "fallbackUsed"
  }],
  "totalDuration": 15
}
```

---

## Render & Tasks

| Method | Path | 用途 | 关键参数 | 说明 |
|--------|------|------|----------|------|
| POST | `/creative-plans/:id/render` | 创建渲染任务 | 见下表 | 需 plan 已 approve |
| GET | `/tasks` | 任务列表 | 无 | 默认最近 20 条 |
| GET | `/tasks/:id` | 任务详情 | `id` | 含 logs、progress |
| POST | `/tasks/:id/retry` | 重试失败任务 | 无 | 按 renderMode 分支 |

**POST render Body 示例：**

```json
{
  "renderMode": "full_video",
  "primaryMaterialId": "optional"
}
```

智能剪辑：

```json
{
  "renderMode": "smart_clip_edit",
  "withSubtitle": true,
  "withTts": false,
  "withBgm": false
}
```

| renderMode | provider | 说明 |
|------------|----------|------|
| 省略或 `full_video` | seedance_1_5 / ffmpeg_fallback | Seedance 整片 |
| `smart_clip_edit` | smart_clip_edit | FFmpeg 商家素材剪辑 |

常见错误：`INVALID_STATUS`（未 approve）、任务失败见 `errorMessage`。

---

## ReferenceVideo

| Method | Path | 用途 |
|--------|------|------|
| POST | `/reference-videos` | 创建参考视频记录 |
| POST | `/reference-videos/upload` | 上传参考视频文件 |
| GET | `/reference-videos` | 列表 |
| GET | `/reference-videos/:id` | 详情 |
| POST | `/reference-videos/:id/analyze` | 结构化拆解（Doubao） |

---

## InspirationTemplate

| Method | Path | 用途 |
|--------|------|------|
| GET | `/inspiration-templates` | 模板库列表 |
| GET | `/inspiration-templates/:id` | 模板详情 |
| POST | `/inspiration-templates` | 创建模板 |
| PUT | `/inspiration-templates/:id` | 更新 |
| POST | `/inspiration-templates/:id/archive` | 归档 |
| POST | `/inspiration-templates/seed-builtins` | 内置种子 |
| POST | `/inspiration-templates/generate` | 规则生成模板 |
| GET | `/products/:productId/inspiration-templates/recommendations` | 模板推荐 |

---

## Analytics

| Method | Path | 用途 |
|--------|------|------|
| GET | `/analytics/overview` | 总览指标 |
| GET | `/analytics/template-performance` | 模板表现 |
| GET | `/analytics/template-performance/compare` | 模板对比 |
| GET | `/analytics/metrics` | 指标列表 |
| GET | `/analytics/metrics/import-batches` | 导入批次 |
| POST | `/analytics/metrics/mock-seed` | Mock 种子 |
| POST | `/analytics/metrics/mock-reset` | 重置 Mock |
| POST | `/analytics/metrics/import-csv` | CSV 导入 |

---

## Workspace

| Method | Path | 用途 |
|--------|------|------|
| GET | `/workspace/tasks` | 工作台任务摘要 |

---

## 静态资源

| 路径 | 说明 |
|------|------|
| `GET /uploads/*` | 本地上传素材 |
| `GET /outputs/{taskId}.mp4` | 渲染成片（HTTP 200 表示可访问） |

---

## Smart Edit 错误码速查

| code | 含义 |
|------|------|
| `NO_MATERIALS` | 商品无素材 |
| `NO_MATERIAL_CLIPS` | 未分析 clips 或分析结果为空 |
| `SMART_EDIT_PLAN_NOT_FOUND` | 尚未生成计划 |
| `CREATIVE_PLAN_NOT_FOUND` | 方案不存在或无分镜 |
| `SMART_EDIT_OVERRIDE_NOT_FOUND` | override 的 sceneId/clipId 无效 |
| `INVALID_STATUS` | 方案未 approve 即 render |
