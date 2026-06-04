# Agent B：后端 MaterialClip / Smart Edit Render

> 同时阅读 `README_SMART_CLIP_EDITING_COMMAND_CENTER.md`。  
> 你的目标：提供 MaterialClip 持久化、API、smart_clip_edit render mode 和 FFmpeg 合成接线。

## 第一轮只输出计划

扫描：

```text
apps/api/prisma/schema.prisma
apps/api/src/modules/materials/**
apps/api/src/modules/render/**
apps/api/src/modules/creative-plans/**
apps/api/src/providers/video/FFmpegComposeProvider.ts
apps/api/src/app.ts
packages/shared/src/types/index.ts
packages/shared/src/types/ai-providers.ts
```

只回复：

```text
1. Prisma 变更
2. API 路由设计
3. RenderService 如何接 smart_clip_edit
4. FFmpegComposeProvider 需要扩展什么
5. 与 Agent C 的 Provider 依赖
6. 拟修改文件
7. 风险
```

## 必须实现

新增：

```text
apps/api/prisma/migrations/<timestamp>_add_material_clip_smart_edit/migration.sql
apps/api/src/modules/material-clips/materialClip.types.ts
apps/api/src/modules/material-clips/materialClip.service.ts
apps/api/src/modules/material-clips/materialClip.controller.ts
apps/api/src/modules/material-clips/materialClip.routes.ts
apps/api/src/modules/smart-edit/smartEdit.service.ts
apps/api/src/modules/smart-edit/smartEdit.controller.ts
apps/api/src/modules/smart-edit/smartEdit.routes.ts
```

修改：

```text
apps/api/prisma/schema.prisma
apps/api/src/app.ts
apps/api/src/modules/render/render.controller.ts
apps/api/src/modules/render/render.service.ts
apps/api/src/providers/video/FFmpegComposeProvider.ts
apps/api/src/shared/types.ts
packages/shared/src/types/index.ts
packages/shared/src/types/ai-providers.ts
```

共享类型由 Agent B 统一落地。Agent A / C 只消费类型，不抢改共享合同。

## API

```text
POST /api/products/:productId/material-clips/analyze
GET  /api/products/:productId/material-clips
POST /api/creative-plans/:id/smart-edit/plan
GET  /api/creative-plans/:id/smart-edit/plan
POST /api/creative-plans/:id/render
```

返回错误码建议：

```text
NO_MATERIALS             商品没有素材
NO_MATERIAL_CLIPS        没有可用 clips
SMART_EDIT_PLAN_NOT_FOUND 尚未生成剪辑计划
CREATIVE_PLAN_NOT_FOUND  方案不存在
FFMPEG_UNAVAILABLE       FFmpeg 不可用
SMART_EDIT_FAILED        智能剪辑失败
```

`POST /render`：

```text
renderMode=smart_clip_edit -> SmartEditService
otherwise -> existing Seedance full_video behavior
```

## FFmpeg

扩展合成输入，至少支持：

```text
source url
startTime
endTime
duration
subtitle
transition
```

要求：

```text
视频 clip 裁剪到 scene.duration
图片 clip 生成动效
统一 1080x1920
字幕烧录
拼接输出 mp4
失败写入 task.errorMessage
```

FFmpegProvider 扩展建议：

```ts
generateFromSmartEdit(input: {
  plan: CreativePlan;
  decisions: SmartEditDecision[];
  outputPath: string;
  bgmUrl?: string;
  voiceoverUrl?: string;
}): Promise<FinalComposeOutput>
```

不要破坏现有：

```text
generateFromPlan
compose
scene preview
full_video fallback
```

## 任务进度

Smart edit task 日志：

```text
读取素材
分析 clips
匹配分镜
生成字幕
FFmpeg 合成
导出 mp4
```

进度建议：

```text
0   任务已创建
10  读取方案与素材
25  分析素材 clips
40  匹配分镜
55  生成字幕
70  FFmpeg 合成
90  导出 mp4
100 智能剪辑完成
```

`GenerationTask`：

```text
provider = "smart_clip_edit"
renderMode = "smart_clip_edit"
type = "render"
```

## 禁止修改

```text
Seedance Provider
ReferenceVideo 模块
Analytics 模块
```

## 验收

```bash
npm.cmd --prefix apps/api run db:generate
npm.cmd --prefix apps/api run build
git diff --check
```

API 验收：

```text
POST material-clips/analyze
GET material-clips
POST smart-edit/plan
GET smart-edit/plan
POST render with smart_clip_edit
GET task success
GET /outputs/*.mp4 200
```

交付说明必须写：

```text
migration 名称
新增 API
新增/修改的 service
smart_clip_edit 是否复用旧 render endpoint
FFmpeg 合成方式
构建结果
未完成项
```
