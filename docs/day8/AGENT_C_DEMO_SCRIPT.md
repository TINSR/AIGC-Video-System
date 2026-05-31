# Day 8 Agent C 演示话术

> 用于答辩，说明多 Agent 剧本生成和视频方案。

---

## 开场

当前 Day 8 版本已实现轻量多 Agent 协同剧本生成，将 CreativePlan 生成从 Mock 模板升级为分阶段 Agent Pipeline。

---

## 多 Agent Pipeline 说明

ProductAnalystAgent 分析商品的品类、目标用户、核心卖点和可用素材，输出结构化分析结果。

CreativeStrategyAgent 根据分析结果决定卖点展示顺序、情绪节奏（痛点引入 -> 解决方案 -> 效果展示 -> 促单转化）和推荐分镜数量。

VisualBibleAgent 固定全片的视觉一致性：商品外观、色调、光线、镜头风格和连贯性规则。所有分镜的 Seedance prompt 都会注入这些设定。

ScriptAgent 生成广告文案：标题、hook、广告词、CTA 和旁白风格。

StoryboardAgent 将策略拆分为 1-4 个分镜，每个分镜有明确的目标（hook/feature/proof/cta）、画面描述、字幕、旁白和转场。

SeedancePromptAgent 为每个分镜生成视频模型 prompt，注入 VisualBible 设定、分镜目标、素材使用信息和商品一致性规则。

ComplianceAgent 和 ContinuityAgent 做合规与连贯性检查，输出 warnings。

RevisionAgent 做一轮轻量修正：补齐缺失字段、修正超时、修正缺失 goal，不做无限循环。

---

## 关键设计决策

多 Agent 是内部 pipeline，对外仍返回标准 CreativePlan 对象，前端不需要感知内部 Agent 细节。

agentTrace 只保存每个 Agent 的摘要（名称、状态、一句话摘要、耗时），不保存 API Key、完整原始 prompt 或模型内部推理。

视频生成仍采用整片 prompt 一次提交 Seedance，优先保证端到端稳定。分镜级生成是后续增强方向。

素材传入远端需要 base64 或公网 URL，本地 /uploads 路径不能直接给 Seedance 访问。当前已实现素材描述注入 prompt。

---

## Seedance / FFmpeg 双链路

有 SEEDANCE_API_KEY 时优先走 Seedance 远端生成。无 Key、失败、超时或未返回 videoUrl 时自动降级到 FFmpeg 兜底。

远端视频成功后自动下载到本地 /outputs 目录，前端统一使用本地路径访问。

---

## 仍需后续改进

分镜级生成：当前是整片 prompt 一次生成，后续支持逐分镜生成 clip，用户选择后拼接。

素材 base64 传入：当前只传素材描述到 prompt，后续支持图片 base64 作为 Seedance 的 image reference。

真实 LLM 接入：当前 Pipeline 使用规则生成文案和分镜，后续可替换为真实 LLM Provider。
