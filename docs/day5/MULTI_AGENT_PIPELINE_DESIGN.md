# Day 5 多 Agent Pipeline 最终设计

> 基线：`origin/codex/integrate-ai-video`，HEAD `d19fda3`
> 目标：规划最终版本的多 Agent 生成方案，并指导 Day5 最小落地。
> 核心原则：多 Agent 是 AI 模块内部实现，前后端仍以 `CreativePlan` 为稳定契约。

---

## 1. 设计结论

最终版本采用：

```text
双审核流程 + 多 Agent Pipeline + CreativePlan 稳定输出
```

用户流程：

```text
商品信息 / 商户广告词 / 素材
-> 生成创意策略
-> 用户审核策略
-> 生成分镜方案
-> 用户审核并剪辑分镜
-> 用户确认
-> Seedance / FFmpeg 生成视频
```

工程边界：

```text
AI 内部可以多 Agent
后端 API 尽量稳定
前端只消费 CreativePlan / CreativeStrategy 摘要
不要把每个 Agent 的完整中间输出都丢给前端
```

---

## 2. 为什么要做多 Agent

现在系统已经能：

- 生成 CreativePlan。
- 编辑分镜。
- 调用 Seedance。
- 失败时走 FFmpeg fallback。

但后续如果要支持：

- 单分镜预览。
- 单分镜重生成。
- 多分镜分别生成。
- 素材匹配。
- 用户多次修改和回退。

就需要更稳定的前置生成逻辑。

多 Agent 的价值是：

```text
先分析商品
再定策略
再固定视觉设定
再写文案和分镜
再生成 Seedance prompt
再做合规和连贯性检查
最后交给用户审核
```

---

## 3. 最终 Agent 链路

推荐链路：

```text
Product Analyst Agent
-> Material Analyst / Selector Agent
-> Creative Strategy Agent
-> User Strategy Review
-> Visual Bible Agent
-> Script Agent
-> Storyboard Agent
-> Seedance Prompt Agent
-> Compliance Agent
-> Continuity Agent
-> Revision Agent
-> User Storyboard Review
-> Render Strategy
```

说明：

- `User Strategy Review` 是第一次审核。
- `User Storyboard Review` 是第二次审核，也就是现在的分镜剪辑台。
- `Render Strategy` 决定使用 `full_video` 还是未来的 `scene_clips`。

---

## 4. 各 Agent 职责

### Product Analyst Agent

负责理解商品。

输出：

```text
商品品类
目标用户
用户痛点
核心卖点
限制条件
素材概况
```

### Material Analyst / Selector Agent

负责理解素材，并为分镜建议素材用途。

素材用途：

```text
reference_image：商品参考图
source_clip：直接剪辑的视频素材
keyframe_reference：视频抽帧参考
prompt_only：不使用素材，仅用 prompt
```

Day5 可以先只做设计，Day6 再落地。

### Creative Strategy Agent

负责生成第一次审核的策略。

输出：

```text
视频目标
目标人群
卖点顺序
情绪节奏
风格方向
推荐分镜数，1-4
```

### Visual Bible Agent

负责固定视觉一致性。

输出沿用现有 `VisualBible`：

```text
aspectRatio
style
colorTone
lighting
cameraStyle
productAppearance
mainScenes
continuityRules
```

关键要求：

```text
每个 scene.seedancePrompt 必须注入 VisualBible。
```

### Script Agent

负责文案。

输出：

```text
title
hook
adCopy
cta
旁白风格
```

### Storyboard Agent

负责生成分镜。

分镜数量：

```text
最少 1 个
最多 4 个
默认 4 个
总时长不超过 15 秒
```

分镜目标：

```text
1 个分镜：full_demo
2 个分镜：hook/feature + cta
3 个分镜：hook + feature/proof + cta
4 个分镜：hook + feature + proof + cta
```

### Seedance Prompt Agent

负责把结构化分镜转成 Seedance prompt。

每个 prompt 至少包含：

```text
商品外观
全局风格
当前分镜目标
画面描述
字幕
旁白
转场
禁止改变商品外观的规则
```

### Compliance Agent

负责广告合规检查。

检查：

```text
第一
唯一
最强
全网最低
包治
100% 有效
夸张承诺
医疗功效风险
```

### Continuity Agent

负责连贯性检查。

检查：

```text
VisualBible 是否完整
scene 是否包含商品外观
scene 目标是否合理
总时长是否超限
转场是否缺失
素材是否匹配
```

### Revision Agent

负责自动修订明确问题。

允许自动修：

```text
低风险广告词替换
缺少 transition
duration 超出范围
prompt 没有注入 VisualBible
```

不自动决定：

```text
高风险合规问题
用户核心卖点取舍
风格方向大改
```

这些保留 warning 给用户审核。

---

## 5. Agent 输出形式

Agent 输出应该是结构化 JSON。

推荐流程：

```text
Agent JSON
-> PipelineState
-> CreativeStrategy / CreativePlan
-> 前端展示
-> Seedance prompt 文本
```

不要让 Agent 只输出自然语言长文。

后端必须做：

```text
JSON 解析
schema 校验
字段规范化
失败 fallback
```

如果后续接真实 LLM，不要裸信模型输出。

---

## 6. 数据库存储原则

不需要保存每个 Agent 的完整原始输出。

必须保存：

```text
CreativeStrategy
CreativePlan
Scene
VisualBible
Warnings
GenerationTask
TaskLog
```

建议保存摘要：

```text
AgentTrace
RevisionHistory
PromptTrace
```

不建议默认保存：

```text
完整 LLM 原始响应
完整系统 prompt
完整上下文
API Key
headers
模型内部推理
```

当前 Prisma 已经有：

```text
CreativePlan.promptTrace Json?
```

可以先用它保存轻量 trace。

---

## 7. 前端展示原则

前端不展示全部 Agent 中间结果。

前端主要展示：

```text
策略审核区
VisualBible
分镜剪辑台
Warnings
任务进度
视频结果
```

可选展示：

```text
AI 生成过程 agentTrace 折叠区
```

agentTrace 只显示摘要：

```text
商品分析完成
创意策略完成
视觉风格已锁定
分镜生成完成
合规检查通过
连贯性检查发现 1 个提醒
```

不要展示每个 Agent 的完整 JSON。

---

## 8. 重新生成策略

最终版本需要三层重新生成：

### 重新生成整个策略

适用：

```text
整体方向错了
卖点顺序不对
风格不满意
目标人群不对
```

建议新建版本，不覆盖旧版本。

### 重新生成分镜文案 / prompt

适用：

```text
某个分镜画面不满意
字幕不满意
旁白不满意
prompt 不满意
```

可以复用现有接口：

```text
POST /api/creative-plans/:id/scenes/:sceneId/regenerate
```

### 重新生成分镜视频片段

适用：

```text
视频片段效果不好
商品不清楚
动作不自然
```

未来预留：

```text
POST /api/creative-plans/:id/scenes/:sceneId/render
```

这会生成新的 `SceneRenderAsset`，不要直接覆盖旧视频。

---

## 9. 进度条设计

最终版本需要两类进度：

### CreativePlan 生成进度

步骤：

```text
商品分析中
创意策略生成中
视觉风格设定中
分镜脚本生成中
Seedance Prompt 生成中
合规检查中
连贯性检查中
方案修订中
等待用户审核
```

### 视频 Render 进度

步骤：

```text
读取 CreativePlan
提交 Seedance 任务
等待 Seedance 生成
获取 videoUrl
失败时切换 FFmpeg fallback
生成字幕
拼接视频
导出 mp4
完成
```

前端只需要知道当前步骤和简短日志，不需要完整中间产物。

---

## 10. 预留字段建议

### CreativeStrategy

```ts
type CreativeStrategy = {
  id: string;
  productId: string;
  status: "draft" | "approved" | "rejected";
  videoGoal: string;
  targetAudience: string;
  sellingPointOrder: string[];
  emotionalArc: string;
  styleDirection: string;
  recommendedSceneCount: number;
  warnings: string[];
  agentTrace?: AgentTrace[];
  createdAt: string;
  updatedAt: string;
};
```

### Scene

```ts
type SceneGoal = "full_demo" | "hook" | "feature" | "proof" | "cta";

type MaterialUsage =
  | "reference_image"
  | "source_clip"
  | "keyframe_reference"
  | "prompt_only";

type Scene = {
  goal?: SceneGoal;
  materialUsage?: MaterialUsage;
  negativePrompt?: string;
  previewVideoUrl?: string;
  renderStatus?: "idle" | "pending" | "running" | "success" | "failed";
};
```

### AgentTrace

```ts
type AgentTrace = {
  agent: string;
  status: "success" | "warning" | "failed";
  summary: string;
  durationMs?: number;
  warnings?: string[];
};
```

### SceneRenderAsset

```ts
type SceneRenderAsset = {
  id: string;
  sceneId: string;
  taskId?: string;
  provider: "seedance_1_5" | "ffmpeg_fallback";
  status: "pending" | "running" | "success" | "failed";
  providerTaskId?: string;
  remoteVideoUrl?: string;
  localVideoUrl?: string;
  duration: number;
  selected: boolean;
  errorMessage?: string;
  createdAt: string;
};
```

---

## 11. Day5 最小落地建议

Day5 不要一口气实现所有最终设计。

P0：

```text
新增 CreativePlanPipeline skeleton
保持 generate API 不变
返回 CreativePlan 不变
每个 scene prompt 注入 VisualBible
每个 scene 有 goal 信息，字段没有就先写入 prompt/trace
Compliance/Continuity 继续运行
MockAiProvider 保留 fallback
```

P1：

```text
预留 shared types 可选字段
输出 agentTrace 摘要
前端展示 strategy/agentTrace 的占位区
```

P2：

```text
CreativeStrategy 独立 API
CreativePlan 生成异步 task
SceneRenderAsset
scene-level render
素材 base64 / 抽帧 / 对象存储
```

---

## 12. 验收标准

Day5 多 Agent 改进必须满足：

```text
API 路径不变
CreativePlan 返回结构兼容
前端剪辑台不坏
generate -> save scenes -> approve -> render -> get task 不坏
Seedance/fallback 不坏
build 通过
无密钥泄露
```

