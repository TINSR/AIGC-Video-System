# Agent C Day 1 任务书：AI 与视频生成

> 角色：AI/视频 Agent  
> 负责范围：Prompt、AI Provider、Seedance 1.5 视频生成方案、TTS 方案、FFmpeg 后处理/兜底、Demo 素材  
> 不负责：前端页面实现、数据库 CRUD、复杂 UI

---

## 1. 你的目标

你要设计系统中最关键的“AI 剧本生成”和“Seedance 1.5 视频生成”链路。第一版必须贴合抖音/火山生态，同时要稳定可演示，不能因为模型排队、审核或 Key 问题导致 Demo 完全不可用。

推荐策略：

```text
多 Agent 生成 CreativePlan，包括广告词、Visual Bible、分镜、台词、Seedance Prompt、合规/连贯性检查
-> 用户可编辑分镜
-> Seedance 1.5 根据分镜和素材生成视频片段或整条视频
-> FFmpeg 添加字幕、BGM、TTS 音轨并导出 15 秒以内 mp4
```

---

## 2. AI Provider 设计

请定义统一接口：

```ts
export interface AiProvider {
  generateScript(input: ScriptInput): Promise<ScriptDraft>;
  regenerateScene(input: SceneRegenerateInput): Promise<SceneDraft>;
  generateMaterialDescription?(input: MaterialDescriptionInput): Promise<string>;
  generateTts?(input: TtsInput): Promise<TtsOutput>;
}
```

第一版至少设计两个实现：

```text
MockAiProvider: 无 API Key 时返回固定样例，保证系统可演示
CreativePlanProvider: 有 API Key 时调用文本模型或模板生成 CreativePlan
SeedanceVideoProvider: 调用 Seedance 1.5 生成视频，是视频主模型
```

不要让系统必须依赖真实模型才能跑起来。

---

## 3. 剧本输入格式

```ts
export type ScriptInput = {
  product: {
    id: string;
    title: string;
    category: string;
    sellingPoints: string[];
    targetAudience: string;
    usageScene: string;
  };
  materials: Array<{
    id: string;
    type: "image" | "video";
    title: string;
    tags: string[];
    aiDescription?: string;
  }>;
  style: "pain_point" | "review" | "scenario" | "discount" | "premium";
  language: "zh-CN" | "en-US";
  maxDuration: number;
};
```

---

## 4. 剧本输出格式

文本模型/模板必须输出可解析 JSON：

```ts
export type CreativePlanDraft = {
  title: string;
  hook: string;
  adCopy: string;
  cta: string;
  visualBible: VisualBibleDraft;
  scenes: SceneDraft[];
  complianceWarnings: string[];
  continuityWarnings: string[];
};

export type VisualBibleDraft = {
  aspectRatio: "9:16" | "16:9";
  style: string;
  colorTone: string;
  lighting: string;
  cameraStyle: string;
  productAppearance: string;
  mainScenes: string[];
  continuityRules: string[];
};

export type SceneDraft = {
  order: number;
  duration: number;
  visualDescription: string;
  subtitle: string;
  voiceover: string;
  seedancePrompt: string;
  recommendedMaterialTags: string[];
  transition: "cut" | "fade" | "zoom";
};
```

约束：

- 总时长不超过 15 秒。
- 分镜数量 3-5 个。
- 每个分镜时长 2-5 秒。
- 必须有开场 Hook。
- 结尾必须有 CTA。
- 不使用“第一”“永久”“100%有效”等绝对化宣传词。

---

## 5. Prompt 模板

```text
你是 TikTok Shop 电商短视频编导。
请根据商品信息生成一条 15 秒以内的带货短视频剧本。

商品标题：{{title}}
商品类目：{{category}}
核心卖点：{{sellingPoints}}
目标人群：{{targetAudience}}
使用场景：{{usageScene}}
可用素材：{{materials}}
视频风格：{{style}}
语言：{{language}}

要求：
1. 总时长不超过 {{maxDuration}} 秒。
2. 输出 3-5 个分镜。
3. 每个分镜必须包含 order、duration、visualDescription、subtitle、voiceover、recommendedMaterialTags、transition。
4. 必须输出 Visual Bible，保证分镜之间商品外观、场景、色调、镜头风格一致。
5. 每个分镜必须输出 Seedance 1.5 prompt。
6. 开头 3 秒必须有 Hook。
7. 结尾必须有明确 CTA。
8. 文案要适合电商转化，但不能使用绝对化违规词。
9. 只输出 JSON，不要输出解释。

JSON 格式：
{
  "title": "...",
  "hook": "...",
  "adCopy": "...",
  "cta": "...",
  "visualBible": {
    "aspectRatio": "9:16",
    "style": "...",
    "colorTone": "...",
    "lighting": "...",
    "cameraStyle": "...",
    "productAppearance": "...",
    "mainScenes": ["..."],
    "continuityRules": ["..."]
  },
  "scenes": [
    {
      "order": 1,
      "duration": 3,
      "visualDescription": "...",
      "subtitle": "...",
      "voiceover": "...",
      "seedancePrompt": "...",
      "recommendedMaterialTags": ["..."],
      "transition": "zoom"
    }
  ],
  "complianceWarnings": [],
  "continuityWarnings": []
}
```

---

## 6. 合规检查

第一版实现一个简单函数即可：

```ts
const bannedWords = ["第一", "永久", "100%有效", "绝对", "全网最低", "最强"];
```

检查字段：

- `subtitle`
- `voiceover`
- `hook`
- `cta`

如果发现违规词：

- 记录 warning。
- 替换为更温和表达。
- 或让 LLM 重新生成。

---

## 7. Seedance 1.5 视频生成方案

第一版视频主路径使用 Seedance 1.5。具体接口参数以活动提供的火山/Seedance 1.5 文档为准，本任务书先定义系统内部需要传给视频生成服务的数据结构。

输入：

```ts
export type SeedanceRenderInput = {
  productId: string;
  creativePlanId: string;
  scenes: Array<{
    order: number;
    duration: number;
    prompt: string;
    materialPath?: string;
    materialType: "image" | "video";
    subtitle: string;
    voiceover?: string;
    style: string;
    transition: "cut" | "fade" | "zoom";
  }>;
  aspectRatio: "9:16" | "16:9";
  maxDuration: number;
};
```

输出：

```ts
export type SeedanceRenderOutput = {
  clips: Array<{
    order: number;
    videoPath: string;
    duration: number;
    providerTaskId?: string;
  }>;
  logs: string[];
};
```

FFmpeg 后处理输入：

```ts
export type FinalComposeInput = {
  clips: Array<{
    order: number;
    videoPath: string;
    duration: number;
    subtitle: string;
    voiceover?: string;
  }>;
  bgmPath?: string;
  aspectRatio: "9:16" | "16:9";
  outputPath: string;
};
```

输出：

```ts
export type FinalComposeOutput = {
  outputVideoPath: string;
  duration: number;
  width: number;
  height: number;
  logs: string[];
};
```

---

## 8. Seedance + FFmpeg 最小实现路径

主路径：

1. 根据每个分镜生成 Seedance 1.5 prompt。
2. 调用 Seedance 1.5 生成分镜视频片段，或根据活动 API 支持能力生成整条视频。
3. 等待任务完成并下载/保存视频片段。
4. 用 FFmpeg 拼接片段。
5. 用 FFmpeg 添加字幕、BGM 和可选 TTS。

兜底路径：

1. 每个分镜生成一个短片段。
2. 把所有短片段拼接。
3. 添加字幕和 BGM。

图片素材处理：

```text
图片 -> 竖版画布 720x1280 -> 居中裁剪/模糊背景 -> 轻微 zoompan -> 片段 mp4
```

视频素材处理：

```text
视频 -> 裁切到分镜时长 -> 转为 720x1280 -> 片段 mp4
```

字幕处理：

```text
根据分镜生成 .srt 文件，再烧录到视频
```

兜底策略：

- 如果 Seedance 1.5 任务排队或失败，使用 FFmpeg 图片轮播方案生成可演示视频。
- 如果 TTS 失败，保留字幕 + BGM。
- 如果某个素材不可用，使用商品主图。
- 如果 BGM 不存在，生成无声视频。

---

## 9. Demo 素材需求

请准备或列出两个商品素材包：

### 商品 1：便携榨汁杯

需要：

- 商品主图 1 张。
- 使用场景图 1 张。
- 细节图 1 张。
- 可选短视频 1 条。

卖点：

- 便携。
- 易清洗。
- 适合上班、健身、旅行。

### 商品 2：旅行收纳包

需要：

- 商品主图 1 张。
- 收纳前后对比图 1 张。
- 细节图 1 张。
- 可选短视频 1 条。

卖点：

- 分类收纳。
- 节省行李箱空间。
- 防水耐磨。

---

## 10. Day 1 交付物

你最终需要输出：

1. `AiProvider` 接口设计。
2. `MockAiProvider` 返回样例。
3. 剧本生成 Prompt。
4. LLM 输出 JSON Schema。
5. Seedance 1.5 分镜视频生成输入格式。
6. 合规检查规则。
7. FFmpeg 后处理与兜底合成流程。
8. Demo 素材需求清单。
9. Day 2 AI/视频开发任务。

---

## 11. 验收标准

你的输出必须能回答：

- 没有 AI Key 时系统怎么演示？
- 文本模型/模板应该返回什么 JSON？
- 如何保证视频不超过 15 秒？
- Seedance 1.5 的输入由哪些字段组成？
- 字幕、BGM、TTS 如何后处理？
- Seedance 或 FFmpeg 失败时怎么兜底？
- Demo 需要准备哪些素材？

---

## 12. 禁止事项

- 不要让系统在 Seedance 1.5 不可用时完全无法演示，必须保留 Mock/FFmpeg 兜底。
- 不要让模型输出自由文本，必须 JSON。
- 不要忽略失败兜底。
- 不要使用来源不明的版权音乐。
- 不要把真实 API Key 写入文档或代码。
