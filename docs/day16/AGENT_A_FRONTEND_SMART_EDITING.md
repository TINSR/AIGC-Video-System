# Agent A：前端 Smart Clip Editing

> 同时阅读 `README_SMART_CLIP_EDITING_COMMAND_CENTER.md`。  
> 你的目标：让评委能看见每个分镜为什么选这个素材片段，并能一键触发智能剪辑成片。

## 第一轮只输出计划

扫描：

```text
apps/web/src/pages/ReviewPage.tsx
apps/web/src/components/CreativePlanReviewPanel.tsx
apps/web/src/components/SceneTimelinePanel.tsx
apps/web/src/pages/TaskPage.tsx
apps/web/src/services/api.ts
packages/shared/src/types/index.ts
```

只回复：

```text
1. 现有审核页结构
2. SmartEditPlan UI 放在哪里
3. 拟新增组件
4. API 方法
5. 风险
```

## 必须实现

新增：

```text
apps/web/src/components/SmartEditDecisionPanel.tsx
apps/web/src/components/SmartEditDecisionCard.tsx
```

修改：

```text
apps/web/src/components/CreativePlanReviewPanel.tsx
apps/web/src/services/api.ts
```

只允许修改上述文件。若需要改 `SceneTimelinePanel`，必须先报告原因。

## UI 功能

审核页新增一个区块：

```text
素材智能剪辑
```

按钮：

```text
分析素材
重新匹配
素材智能剪辑成片
```

每个分镜卡片展示：

```text
scene order
scene goal
scene subtitle
clip 缩略图或文件名
score
reasons
fallbackUsed
```

卡片建议布局：

```text
左侧：分镜信息
  Scene 1 / Hook
  subtitle
  duration

右侧：匹配素材
  clip file / thumbnail
  score
  reasons tags
  fallback badge
```

按钮状态：

```text
分析素材：loading 时禁用其他按钮
重新匹配：没有 clips 时自动提示先分析素材
素材智能剪辑成片：没有 decisions 时自动先 createSmartEditPlan
```

状态：

```text
loading
empty
error
success
```

## API 方法

新增：

```ts
analyzeMaterialClips(productId: string): Promise<MaterialClip[]>
getMaterialClips(productId: string): Promise<MaterialClip[]>
createSmartEditPlan(planId: string): Promise<SmartEditPlan>
getSmartEditPlan(planId: string): Promise<SmartEditPlan>
renderSmartClipEdit(planId: string): Promise<GenerationTask>
```

`renderSmartClipEdit` 调用：

```text
POST /creative-plans/:id/render
body.renderMode = "smart_clip_edit"
```

错误处理：

```text
SMART_EDIT_PLAN_NOT_FOUND -> 提示“请先重新匹配”
NO_MATERIAL_CLIPS -> 提示“请先分析素材”
FFMPEG_UNAVAILABLE -> 展示后端错误，不白屏
```

## 禁止修改

```text
apps/api/**
packages/shared/**
```

## 验收

```bash
npm.cmd --prefix apps/web run build
git diff --check
```

页面验收：

```text
Review 页能展示 smart edit plan
每个分镜有 clip / score / reasons
点击智能剪辑成片跳转任务页
接口失败不白屏
```

交付说明必须写：

```text
新增组件
新增 API 方法
是否支持手动替换 clip
构建结果
未完成项
```
