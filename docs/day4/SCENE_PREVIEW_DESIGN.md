# 分镜级视频预览方案

> Day 4 设计，Day 5 实现

## 目标

```text
POST /api/creative-plans/:id/scenes/:sceneId/render
```

- 只生成单个 scene 的视频片段
- 返回 `previewVideoUrl`
- 前端在分镜剪辑台里预览
- 用户不满意时只重生成这个 scene
- 最终 render 可以复用已有 scene 片段

## 数据模型

### 方案 A：复用 GenerationTask（推荐）

```typescript
interface GenerationTask {
  id: string;
  creativePlanId: string;
  sceneId?: string;           // 新增：如果有值则为 scene-level task
  taskType: 'full' | 'scene'; // 新增：区分全量/单分镜
  status: 'pending' | 'running' | 'success' | 'failed';
  progress: number;
  outputVideoUrl?: string;    // scene-level 时为片段 URL
  // ... 其他字段不变
}
```

优点：不增加新实体，前端 task 页可统一展示。
缺点：taskStore 需要支持按 sceneId 查询。

### 方案 B：独立 ScenePreviewTask

```typescript
interface ScenePreviewTask {
  id: string;
  creativePlanId: string;
  sceneId: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  previewVideoUrl?: string;
  createdAt: string;
}
```

优点：职责清晰。
缺点：增加新实体，前端需要额外接口。

## API 设计

### 1. 创建 scene preview task

```text
POST /api/creative-plans/:id/scenes/:sceneId/render
```

请求体：
```json
{
  "force": false  // true 时即使已有 preview 也重新生成
}
```

响应：
```json
{
  "success": true,
  "data": {
    "taskId": "xxx",
    "sceneId": "scene_1",
    "status": "pending"
  }
}
```

### 2. 查询 scene preview 状态

```text
GET /api/tasks/:taskId
```

复用现有接口，`taskType: 'scene'` 时前端知道这是片段预览。

### 3. 获取 scene 的最新 preview

```text
GET /api/creative-plans/:id/scenes/:sceneId/preview
```

返回该 scene 最近一次成功的 preview task 结果。

## 执行流程

```
POST /scenes/:sceneId/render
  → 查找已有 preview task (status=success, force=false)
  → 如果有，直接返回已有 previewVideoUrl
  → 如果没有，创建新 task
    → 构建单 scene 的 Seedance prompt
    → 调用 Seedance (单 scene)
    → 成功：返回远端 videoUrl
    → 失败：FFmpeg fallback 生成单片段
    → 输出到 /outputs/preview_<taskId>.mp4
    → task.status = success
```

## 最终合成复用

最终 render 时，检查每个 scene 是否有成功的 preview task：

```
for each scene in plan.scenes:
  preview = findPreviewTask(planId, scene.id)
  if preview and preview.status === 'success':
    clip = preview.previewVideoUrl  // 复用
  else:
    clip = generateClip(scene)      // 新生成

concat(clips) → final.mp4
```

## 存储路径

```
/outputs/<taskId>.mp4              # 全量 render
/outputs/preview_<taskId>.mp4      # scene preview
```

## 环境变量

无新增。复用现有 Seedance 和 FFmpeg 配置。

## Day 5 实现计划

1. GenerationTask 增加 `sceneId` 和 `taskType` 字段
2. 实现 `POST /api/creative-plans/:id/scenes/:sceneId/render`
3. 实现 `GET /api/creative-plans/:id/scenes/:sceneId/preview`
4. RenderService 增加 `renderSingleScene()` 方法
5. 最终 render 时支持复用已有 preview 片段
6. 前端分镜剪辑台集成 preview 按钮和播放器
