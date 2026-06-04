# Agent C：Smart Editing Agent / Clip Matching / TTS

> 同时阅读 `README_SMART_CLIP_EDITING_COMMAND_CENTER.md`。  
> 你的目标：实现专业感来自“剪辑决策可解释”，不是简单随机拼接。

## 第一轮只输出计划

扫描：

```text
apps/api/src/modules/materials/**
apps/api/src/modules/creative-plans/CreativePlanPipeline.ts
apps/api/src/providers/ai/**
apps/api/src/providers/video/FFmpegComposeProvider.ts
packages/shared/src/types/index.ts
```

只回复：

```text
1. clip 分析规则
2. scene -> clip 匹配公式
3. TTS Provider 是否可做
4. BGM 策略
5. 拟修改文件
6. 风险
```

## 必须实现

新增：

```text
apps/api/src/providers/smart-edit/MaterialClipAnalyzer.ts
apps/api/src/providers/smart-edit/SceneClipMatcher.ts
apps/api/src/providers/smart-edit/SmartEditPlanner.ts
```

尽量新增：

```text
apps/api/src/providers/tts/ITtsProvider.ts
apps/api/src/providers/tts/XiaomiMimoTtsProvider.ts
apps/api/src/providers/tts/NoopTtsProvider.ts
apps/api/src/providers/audio/BgmProvider.ts
```

## Clip 分析

输入：

```text
Material[]
```

输出：

```text
MaterialClip[]
```

规则：

```text
image material -> image clip
video material -> 先固定 2-4 秒切片，最多 6 个 clip
根据 material.title / tags / role / aiDescription 生成 summary 和 tags
role=product_primary -> product_closeup / cta
视频素材 -> usage_scene / detail / lifestyle 根据标签判断
visualQuality 第一版用规则分：0.65-0.95
```

不要求真实 Doubao clip 级视频理解，时间允许再接。

关键词规则建议：

```text
包含 主图 / 正面 / 商品 -> product_closeup
包含 细节 / 拉链 / 面料 / 防泼水 / 隔层 -> detail
包含 使用 / 场景 / 旅行 / 收纳 -> usage_scene
包含 包装 / 开箱 -> packaging
包含 购买 / 下单 / 优惠 -> cta
```

scene goal 到 suitableGoals：

```text
product_closeup -> feature, cta
detail          -> feature, proof
usage_scene     -> hook, proof
lifestyle       -> hook
packaging       -> proof, cta
cta             -> cta
```

visualQuality 第一版：

```text
product_primary / image -> 0.9
product_detail -> 0.85
usage_scene -> 0.75
普通视频 clip -> 0.7
fallback -> 0.65
```

## 匹配评分

实现：

```text
goalMatch 0-1
keywordMatch 0-1
productVisibility 0-1
visualQuality 0-1
durationFit 0-1
```

公式：

```text
score =
  goalMatch * 0.35
  + keywordMatch * 0.25
  + productVisibility * 0.20
  + visualQuality * 0.15
  + durationFit * 0.05
```

输出 reasons：

```text
命中分镜目标 feature
命中关键词“多隔层”
商品主体清晰
片段时长适合当前分镜
使用商品主图兜底
```

每个 scene 必须有一个 decision。无匹配 clip 时选择主图或第一张图 fallback。

防重复规则：

```text
优先不要连续两个 scene 使用同一个 clip。
如果素材不足允许复用，但 reasons 要写“素材不足，复用最高匹配片段”。
CTA scene 优先用商品主图。
Proof scene 优先用 detail / product_closeup。
Hook scene 优先用 usage_scene / lifestyle。
```

## TTS

P1，可做但不能阻塞：

```text
scene.voiceover 合并为旁白文本
Xiaomi MiMo TTS 生成音频
FFmpeg 混入最终视频
失败时 NoopTtsProvider，保留字幕继续生成
```

注意：

```text
TTS 是 P1。P0 没跑通前不要写 TTS。
不要把小米 TTS 失败变成任务 failed。
只要字幕视频能生成，任务就应继续。
```

环境变量：

```text
TTS_PROVIDER=xiaomi_mimo
MIMO_API_KEY=
MIMO_TTS_BASE_URL=
MIMO_TTS_MODEL=
TTS_VOICE=
```

## BGM

P1，可做本地资产：

```text
assets/bgm/light-commerce.mp3
assets/bgm/upbeat-commerce.mp3
```

如果没有音频资产，Provider 返回 undefined，不阻塞。

不允许提交版权不明音乐。没有可用免版权 BGM，就不做 BGM。

## 禁止修改

```text
apps/web/**
Prisma schema
Seedance Provider
Analytics 模块
```

## 验收

```bash
npm.cmd --prefix apps/api run build
git diff --check
```

功能验收：

```text
同一个 CreativePlan 的 4 个 scenes 能生成 4 个 SmartEditDecision
每个 decision 有 score 和 reasons
至少一个 video clip 被选中
素材不足时 fallback 商品图
TTS 失败不阻塞
```

交付说明必须写：

```text
clip 分析规则
匹配公式
fallback 策略
是否实现 TTS
是否实现 BGM
构建结果
未完成项
```
