# Day 8 分镜级生成方案

> Agent C 输出，Day 8 P1 交付物。

---

## 1. 目标

将当前"整片 prompt 一次提交 Seedance"升级为"逐分镜生成 clip，用户选择后拼接"。

---

## 2. 生成流程

```text
scene 1 -> Seedance clip 1 -> 用户预览
scene 2 -> Seedance clip 2 -> 用户预览
scene 3 -> Seedance clip 3 -> 用户预览
scene 4 -> Seedance clip 4 -> 用户预览
-> 用户选择/重试/替换
-> FFmpeg concat
-> final mp4
```

---

## 3. 数据模型

### GenerationTask 扩展

```text
已有字段：
  type: "render" | "scene_render"
  renderMode: "full_video" | "scene_clips"

新增概念：
  parentTaskId: string  // scene_render 的父任务 ID
```

### Scene 扩展

```text
已有字段：
  previewVideoUrl: string  // 分镜预览视频 URL
  renderStatus: "idle" | "pending" | "running" | "success" | "failed"
```

### SceneRenderAsset（新增表）

```text
id: string
sceneId: string
taskId: string
provider: "seedance_1_5" | "ffmpeg_fallback"
status: "pending" | "running" | "success" | "failed"
providerTaskId: string  // Seedance 远端任务 ID
remoteVideoUrl: string  // Seedance 返回的远端 URL
localVideoUrl: string   // 下载到本地的 /outputs URL
duration: number
selected: boolean       // 用户是否选中此版本
errorMessage: string
createdAt: string
```

---

## 4. API 设计

### 分镜渲染

```text
POST /api/creative-plans/:id/scenes/:sceneId/render
Body: { renderMode?: "seedance" | "ffmpeg" }
Response: { taskId: string }
```

### 获取分镜渲染状态

```text
GET /api/scenes/:sceneId/render-assets
Response: SceneRenderAsset[]
```

### 选择分镜版本

```text
PUT /api/scenes/:sceneId/render-assets/:assetId/select
Response: { success: boolean }
```

### 重试分镜

```text
POST /api/creative-plans/:id/scenes/:sceneId/render
Body: { retry: true }
Response: { taskId: string }
```

### 拼接最终视频

```text
POST /api/creative-plans/:id/concat
Body: { sceneAssetIds: string[] }
Response: { taskId: string }
```

---

## 5. 文件命名规范

```text
分镜 clip:   /outputs/scene-{sceneId}-{assetId}.mp4
最终拼接:    /outputs/{creativePlanId}-final.mp4
```

---

## 6. 失败重试策略

```text
单分镜失败：
  1. 不影响其他分镜
  2. 用户可点击"重试"重新生成该分镜
  3. 重试生成新的 SceneRenderAsset，不覆盖旧的
  4. 用户可从多个版本中选择一个
```

---

## 7. 视觉连贯性保障

```text
1. 所有分镜共享同一个 VisualBible
2. 每个分镜的 seedancePrompt 注入相同的商品外观、色调、镜头风格
3. 连贯性规则在每个 prompt 中重复强调
4. 用户可参考上一分镜的截图作为下一分镜的参考
```

---

## 8. 等待时间优化

```text
当前整片生成：3-5 分钟（一个 Seedance 任务）
分镜级生成：每分镜 1-2 分钟，可并行

方案 A：串行生成（简单，等待时间长）
  scene 1 -> scene 2 -> scene 3 -> scene 4
  总等待：4-8 分钟

方案 B：并行生成（复杂，等待时间短）
  scene 1 | scene 2 | scene 3 | scene 4
  总等待：1-2 分钟（取决于最慢的分镜）

建议：Day 9 先实现方案 A，Day 10 优化为方案 B
```

---

## 9. 实施计划

```text
Day 8:  方案设计（本文档）
Day 9:  POST /scenes/:sceneId/render 接口 + 单分镜 Seedance 提交
Day 10: SceneRenderAsset 模型 + 分镜预览 UI
Day 11: 分镜重试 + 版本选择 + FFmpeg concat
Day 12: 并行生成优化
```
