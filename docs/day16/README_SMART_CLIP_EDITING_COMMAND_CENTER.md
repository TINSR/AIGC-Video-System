# Day16-17 总控文档：Smart Clip Editing Agent

> 基线：`origin/codex/day15-baseline @ 381c043`  
> 目标：两天内补齐赛题 P1 的“智能剪辑 Agent”能力。  
> 原则：做专业但收敛的比赛版 MVP，不推翻 Seedance 整片生成，不做向量库，不做复杂卡点。

## 1. 为什么要做

当前系统主创作模式是：

```text
CreativePlan 分镜
-> 拼成一个结构化 Seedance prompt
-> Seedance 返回一条完整视频
```

这已经满足 P0，但“智能剪辑”较弱。赛题里的智能剪辑指：

```text
基于素材切片三层标签体系
结合剧本分镜
自动完成画面拼接、转场、字幕、配音、配乐合成
```

Day16-17 要新增第二种创作模式：

```text
AI Full Video：Seedance 整片生成
Smart Clip Edit：商家真实素材智能剪辑
```

## 2. 最终用户故事

```text
商家上传商品图片 / 视频
-> 系统把视频切成 MaterialClip，图片包装成 image clip
-> Smart Editing Agent 分析 clip 标签、摘要、质量和适用分镜
-> 根据 CreativePlan 的 scene.goal / subtitle / visualDescription 匹配 clip
-> 前端展示每个分镜选中了哪个 clip、得分和理由
-> 用户可直接生成智能剪辑视频
-> FFmpeg 拼接 clip、烧录字幕、可选 TTS、可选 BGM
-> 输出 mp4
```

一句话产品定义：

```text
Smart Clip Editing Agent 不是重新生成视频，而是把商家真实素材变成可调用镜头库，再根据分镜意图自动选镜头并剪成片。
```

评委必须能看见：

```text
每个分镜选了哪个素材片段
为什么选它
得分是多少
最终视频确实由这些片段合成
```

## 3. 两天边界

### 必须做

```text
MaterialClip 数据结构
SceneClipMatch 数据结构
视频素材切片
图片素材包装成 image clip
clip 规则分析
scene -> clip 匹配评分和理由
smart_clip_edit render mode
FFmpeg clip 拼接
字幕烧录
前端展示匹配结果
“素材智能剪辑”按钮
任务进度
```

### 尽量做

```text
小米 MiMo TTS Provider
BGM 混音
手动替换 clip
重新匹配
```

### 不做

```text
Embedding 向量库
复杂镜头边界检测
自动卡点
多语言 dubbing
Seedance 分镜级 clip 混剪
真实音乐版权库
重写现有 render 主链路
```

砍功能规则：

```text
第一天 22:00 前 smart_clip_edit 还不能输出 mp4：
  立即砍 TTS、BGM、手动替换，只保留 clip 匹配 + 字幕合成。

第二天中午前前端不能展示匹配结果：
  立即砍缩略图预览，只展示 clip 文件名、score、reasons。

第二天下午前 FFmpeg 合成不稳定：
  保留 smart edit plan 展示，render 暂用单图兜底，但必须说明风险。
```

## 4. 三个 Agent 分工

| Agent | 建议分支 | 责任边界 |
| --- | --- | --- |
| Agent A 前端 | `feature/day16-frontend-smart-editing` | 匹配结果 UI、智能剪辑按钮、任务入口 |
| Agent B 后端 | `feature/day16-backend-material-clips` | Prisma、API、FFmpeg 合成、任务接线 |
| Agent C AI/剪辑 | `feature/day16-ai-smart-edit-agent` | clip 分析、匹配评分、TTS/BGM Provider |

从最终基线开新分支：

```bash
git fetch origin
git checkout -b feature/day16-your-task origin/codex/day15-baseline
git log --oneline -1
```

必须看到：

```text
381c043 Merge branch 'feature/day14-ai-template-injection-scoring' into codex/day14-review
```

每个 Agent 第一轮只输出计划，不允许直接写代码：

```text
1. 已读哪些文件
2. 准备改哪些文件
3. 依赖另外两个 Agent 的哪些合同
4. 预计风险
5. 验收方式
```

负责人确认后再进入编码。

## 5. 共享类型合同

新增：

```ts
export type MaterialClipSourceType = "merchant_upload" | "seedance_generated" | "system_asset";
export type MaterialClipType = "image" | "video_clip";
export type ClipSceneType =
  | "product_closeup"
  | "usage_scene"
  | "detail"
  | "packaging"
  | "lifestyle"
  | "cta";

export type MotionLevel = "low" | "medium" | "high";

export type MaterialClip = {
  id: string;
  productId: string;
  materialId: string;
  sourceType: MaterialClipSourceType;
  type: MaterialClipType;
  fileUrl: string;
  thumbnailUrl?: string;
  startTime?: number;
  endTime?: number;
  duration: number;
  summary: string;
  tags: string[];
  sceneType: ClipSceneType;
  visualQuality: number;
  motionLevel: MotionLevel;
  suitableGoals: SceneGoal[];
  createdAt: string;
};

export type SceneClipMatch = {
  id: string;
  creativePlanId: string;
  sceneId: string;
  clipId: string;
  score: number;
  reasons: string[];
  createdAt: string;
};

export type SmartEditDecision = {
  sceneId: string;
  sceneOrder: number;
  sceneGoal?: SceneGoal | null;
  clip?: MaterialClip;
  score: number;
  reasons: string[];
  fallbackUsed: boolean;
};

export type SmartEditPlan = {
  creativePlanId: string;
  decisions: SmartEditDecision[];
  totalDuration: number;
};
```

字段解释：

```text
sourceType:
  merchant_upload       本次默认，只处理商家上传素材
  seedance_generated    预留，不在本次默认使用
  system_asset          BGM / CTA 模板等系统素材，P1 以后再用

sceneType:
  product_closeup       商品主体 / 主图 / 近景
  usage_scene           使用场景
  detail                细节，如拉链、防泼水、隔层
  packaging             包装 / 开箱
  lifestyle             氛围 / 人群 / 生活方式
  cta                   结尾促单

visualQuality:
  0-1，第一版可用规则评分，不必接视觉质量模型。

fallbackUsed:
  true 表示没有找到高匹配 clip，使用商品主图或第一张图兜底。
```

扩展：

```ts
export type RenderMode = "full_video" | "scene_clips" | "smart_clip_edit";

export type GenerationTask = {
  provider: "seedance_1_5" | "ffmpeg_fallback" | "smart_clip_edit";
};
```

## 6. Prisma 建议

新增：

```prisma
model MaterialClip {
  id            String   @id @default(cuid())
  productId     String
  materialId    String
  sourceType    String
  type          String
  fileUrl       String   @db.Text
  thumbnailUrl  String?
  startTime     Float?
  endTime       Float?
  duration      Float
  summary       String   @db.Text
  tags          Json
  sceneType     String
  visualQuality Float
  motionLevel   String
  suitableGoals Json
  createdAt     DateTime @default(now())

  @@index([productId])
  @@index([materialId])
}

model SceneClipMatch {
  id             String   @id @default(cuid())
  creativePlanId String
  sceneId        String
  clipId         String
  score          Float
  reasons        Json
  createdAt      DateTime @default(now())

  @@index([creativePlanId])
  @@index([sceneId])
}
```

第一版不做外键，避免迁移和历史数据冲突。

注意：

```text
MaterialClip 可以重复生成，但同一 materialId 重复 analyze 时建议先删除旧 clips 再写新 clips。
SceneClipMatch 可以按 creativePlanId 删除旧结果后重新生成。
不要把大型二进制文件写入数据库，只存 fileUrl / thumbnailUrl / 时间戳。
```

## 7. API 合同

新增：

```text
POST /api/products/:productId/material-clips/analyze
GET  /api/products/:productId/material-clips
POST /api/creative-plans/:id/smart-edit/plan
GET  /api/creative-plans/:id/smart-edit/plan
POST /api/creative-plans/:id/render
```

### POST /api/products/:productId/material-clips/analyze

用途：

```text
读取该商品所有 Material
图片生成 image clip
视频生成 video_clip
保存 MaterialClip
返回 MaterialClip[]
```

请求体：

```json
{
  "force": true
}
```

规则：

```text
force=true：删除旧 clips 后重建
force=false 或缺失：已有 clips 时直接返回
```

### GET /api/products/:productId/material-clips

返回：

```ts
MaterialClip[]
```

排序：

```text
materialId
startTime
createdAt
```

### POST /api/creative-plans/:id/smart-edit/plan

用途：

```text
读取 CreativePlan scenes
读取 product MaterialClip
生成 SceneClipMatch
返回 SmartEditPlan
```

请求体：

```json
{
  "force": true
}
```

规则：

```text
没有 clips 时自动触发 material-clips/analyze
每个 scene 必须返回一个 decision
匹配不到时 fallback 商品主图 / 第一张 image clip
```

### GET /api/creative-plans/:id/smart-edit/plan

返回上次保存的匹配结果。若不存在：

```text
404 SMART_EDIT_PLAN_NOT_FOUND
```

`POST /render` 扩展：

```json
{
  "renderMode": "smart_clip_edit",
  "withSubtitle": true,
  "withTts": false,
  "withBgm": true
}
```

规则：

```text
renderMode 缺失：沿用 Seedance full_video
renderMode=smart_clip_edit：不调用 Seedance，走 Smart Editing Agent + FFmpeg
```

任务返回：

```ts
GenerationTask
```

任务字段：

```text
provider = "smart_clip_edit"
type = "render"
renderMode = "smart_clip_edit"
currentStep 随阶段变化
logs 记录每个阶段
```

## 8. 剪辑评分

推荐公式：

```text
score =
  goalMatch * 0.35
  + keywordMatch * 0.25
  + productVisibility * 0.20
  + visualQuality * 0.15
  + durationFit * 0.05
```

实现可简化：

```text
goalMatch：scene.goal 是否命中 clip.suitableGoals
keywordMatch：scene 文案是否命中 clip.tags / summary
productVisibility：image clip 或 role=product_primary 给高分
visualQuality：clip.visualQuality
durationFit：clip.duration 与 scene.duration 接近
```

每个 match 必须有自然语言 reasons。

评分细则：

```text
goalMatch:
  scene.goal 在 clip.suitableGoals 中 -> 1
  scene.goal 缺失但 clip.sceneType 合适 -> 0.6
  否则 -> 0.2

keywordMatch:
  scene.subtitle / voiceover / visualDescription 命中 clip.tags 或 summary
  命中 2 个以上 -> 1
  命中 1 个 -> 0.6
  无命中 -> 0.2

productVisibility:
  clip.sceneType=product_closeup 或 material.role=product_primary -> 1
  image clip -> 0.8
  usage_scene -> 0.5
  否则 -> 0.3

visualQuality:
  直接使用 clip.visualQuality

durationFit:
  abs(clip.duration - scene.duration) <= 1 -> 1
  <= 2 -> 0.7
  否则 -> 0.4
```

示例输出：

```json
{
  "sceneId": "scene_02",
  "clipId": "clip_03",
  "score": 86,
  "reasons": [
    "命中分镜目标 feature",
    "命中关键词：多隔层、收纳",
    "商品主体清晰",
    "片段时长适合当前分镜"
  ]
}
```

## 9. FFmpeg 合成要求

Smart Clip Edit 输出：

```text
9:16
总时长 <= 15 秒
每个 scene 对应一个 clip 或 fallback 商品图
字幕必须烧录
转场至少 cut / fade
视频素材裁剪到 scene.duration
图片素材生成 Ken Burns 动效
BGM / TTS 失败不阻塞
```

合成策略：

```text
1. 每个 decision 生成一个标准化 temp clip
2. 视频 clip：
   - ss=startTime
   - t=scene.duration
   - scale/crop/pad 到 1080x1920
   - fps=25
   - 烧录 scene.subtitle
3. 图片 clip：
   - loop 生成 scene.duration 秒
   - zoompan 或轻微平移动效
   - scale/crop/pad 到 1080x1920
   - 烧录 scene.subtitle
4. concat 拼接
5. 可选混入 TTS voiceover
6. 可选混入 BGM，BGM 音量低于 voiceover
7. 输出 /outputs/<taskId>.mp4
```

字幕要求：

```text
中文字体优先使用 Windows msyh.ttc / simhei.ttf
字幕位置：底部 70%-82% 区域
字幕背景：半透明黑底
字号：40-54，根据已有 FFmpeg Provider 能力调整
```

总时长：

```text
优先遵守 scene.duration
总时长超过 15 秒时，从最后一个 scene 开始压缩
每个 scene 最短 1 秒
```

## 10. 前端展示要求

Review 页新增：

```text
素材智能剪辑
------------------------------------------------
分镜 1 Hook       clip_xxx  得分 82  痛点场景匹配
分镜 2 Feature    clip_xxx  得分 91  命中多隔层
分镜 3 Proof      clip_xxx  得分 76  商品细节清晰
分镜 4 CTA        image_xx  得分 88  商品主图清晰
------------------------------------------------
[分析素材] [重新匹配] [素材智能剪辑成片]
```

不要让用户看不出“智能”在哪里。

前端不需要实现复杂编辑器。最后两天只要求：

```text
可查看匹配结果
可重新生成匹配
可触发智能剪辑 render
可跳转任务页
```

手动替换 clip 是 P1；如果做，必须非常轻：

```text
每个 scene 卡片一个 Select
选项来自 MaterialClip
保存后重新生成 SmartEditPlan
```

## 11. 验收

```bash
npm.cmd --prefix apps/api run db:generate
npm.cmd --prefix apps/api run build
npm.cmd --prefix apps/web run build
git diff --check
```

功能验收：

```text
上传至少 1 张商品图 + 1 个商品视频
生成 CreativePlan
分析素材 clips
生成 smart edit plan
每个分镜展示 clip / score / reasons
点击素材智能剪辑成片
任务 success
/outputs/*.mp4 HTTP 200
```

最低可提交标准：

```text
没有 TTS / BGM 也可以
但必须有：
  clips
  decisions
  score
  reasons
  smart_clip_edit task
  mp4 输出
```

推荐演示素材：

```text
旅行收纳包商品
1 张主图
1 个 8-15 秒商品展示视频
卖点：
  多隔层分类收纳
  防泼水面料
  双向拉链，开合方便
```

## 12. 答辩讲法

```text
系统提供双创作模式：
1. Seedance AI Full Video：适合创意生成
2. Smart Clip Editing Agent：适合商家真实素材剪辑

Smart Clip Editing Agent 会把商品素材切成可调用 clips，理解每个 clip 的内容、标签和适用分镜，再根据 CreativePlan 自动选择镜头、解释选择理由，并用 FFmpeg 完成字幕、转场、配音和 BGM 合成。
```
