# Day 6 Agent C 演示说明材料

> 用途：Day7 中期演示答辩，解释多 Agent 视频生成流程。

---

## 多 Agent Pipeline 总览

系统内部采用多 Agent Pipeline 生成 TikTok 电商广告视频的 CreativePlan。对外接口不变，返回标准 `CreativePlan` 对象。

Pipeline 链路：

```text
用户输入商品信息 + 素材
  -> Product Analyst Agent（分析商品品类、目标用户、核心卖点）
  -> Creative Strategy Agent（决定卖点顺序、情绪节奏、分镜数）
  -> Visual Bible Agent（锁定商品外观、色调、镜头风格）
  -> Script & Storyboard Agent（生成文案和 1-4 个分镜）
  -> Seedance Prompt Agent（注入 VisualBible，生成视频 prompt）
  -> Compliance Agent（检查广告法风险词）
  -> Continuity Agent（检查分镜连贯性）
  -> 输出 CreativePlan
```

---

## 各 Agent 职责说明

### Product Analyst Agent

分析商品的品类、目标用户画像、使用场景和核心卖点。输出结构化分析结果供后续 Agent 使用。

### Creative Strategy Agent

根据商品分析结果，决定视频的卖点展示顺序、情绪节奏（痛点引入 -> 解决方案 -> 效果展示 -> 促单转化）和推荐分镜数量。

### Visual Bible Agent

固定全片的视觉一致性设定：商品外观描述、色调、光线、镜头风格、连贯性规则。确保所有分镜的 Seedance prompt 都注入了这些设定。

### Script & Storyboard Agent

生成广告文案（标题、hook、广告词、CTA）和 1-4 个分镜脚本。每个分镜包含画面描述、字幕、旁白、转场和 Seedance prompt。

### Seedance Prompt Agent

将 VisualBible 的商品外观、风格、色调、镜头风格和连贯性规则注入每个分镜的 seedancePrompt，确保视频生成时商品外观一致。

### Compliance Agent

检查文案中的广告法风险词，如"第一"、"唯一"、"最强"、"全网最低"、"包治"、"100% 有效"等。

### Continuity Agent

检查分镜的连贯性：VisualBible 是否完整、分镜是否包含商品外观、总时长是否超限、转场是否缺失。

---

## Seedance / FFmpeg 双链路

```text
有 SEEDANCE_API_KEY
  -> 提交 Seedance 1.5 远端任务
  -> 轮询任务状态
  -> 成功且有 videoUrl：下载到本地 /outputs/<taskId>.mp4
  -> 成功但无 videoUrl：切换 FFmpeg 兜底
  -> 失败/超时：切换 FFmpeg 兜底

无 SEEDANCE_API_KEY
  -> 直接走 FFmpeg 兜底合成

FFmpeg 兜底链路
  -> 素材存在：使用素材生成分镜片段 + 烧录字幕
  -> 素材不存在：纯色背景 + 字幕
  -> 拼接所有片段 -> 输出 /outputs/<taskId>.mp4
```

关键保护：

- 无 Key 时不会崩溃，自动降级到 FFmpeg
- Seedance 失败/超时/无 videoUrl 均自动切换 FFmpeg
- 日志只显示"API Key 已配置/未配置"，不泄露真实 Key
- 远端视频成功后自动下载到本地，前端统一使用 `/outputs/` 路径

---

## agentTrace 安全说明

`agentTrace` 只保存每个 Agent 的摘要信息：

```text
agent: Agent 名称
status: success / warning / failed
summary: 一句话摘要
durationMs: 耗时（可选）
warnings: 警告列表（可选）
```

不包含：

- 完整的 LLM 原始响应
- API Key
- 完整的系统 prompt
- 模型内部推理过程

---

## 输出字段对照

| 字段 | 来源 | 说明 |
|------|------|------|
| `creativePlan.creativeStrategy` | Pipeline Stage 2 | 视频目标、卖点顺序、情绪节奏 |
| `creativePlan.visualBible` | Pipeline Stage 3 | 商品外观、色调、镜头风格 |
| `creativePlan.agentTrace` | Pipeline 各 Stage | 每个 Agent 的执行摘要 |
| `scene.goal` | Pipeline Stage 7 | hook / feature / proof / cta |
| `scene.materialUsage` | Pipeline Stage 7 | source_clip / reference_image / prompt_only |
| `scene.seedancePrompt` | Pipeline Stage 6 | 含 VisualBible 注入的视频 prompt |
| `complianceWarnings` | Compliance Agent | 广告法风险词警告 |
| `continuityWarnings` | Continuity Agent | 连贯性检查警告 |

---

## 仍需 Day7 改进

1. CreativeStrategy 持久化：当前 creativeStrategy 仅在内存中，未写入 Prisma（schema 需新增 Json 字段）
2. 分镜级预览渲染：当前只有 full_video 模式，scene_clips 预览需要后端配合实现 `POST /api/creative-plans/:id/scenes/:sceneId/render`
3. 真实 LLM 接入：当前 Pipeline 使用 MockAiProvider 生成文案，后续可替换为真实 LLM Provider
4. 素材智能匹配：当前 materialUsage 分配基于简单规则，后续可接入 Material Analyst Agent
