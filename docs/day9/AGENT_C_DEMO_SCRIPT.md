# Day 9 Agent C 演示话术

> 用于答辩，说明真实 LLM 接入和素材传入方案。

---

## 开场

Day 9 版本实现了两个核心增强：可配置真实 LLM 接入多 Agent Pipeline，以及图片素材 base64 真实传入 Seedance。

---

## 真实 LLM Provider

系统支持两种模式：

规则型多 Agent Pipeline（默认）：ProductAnalystAgent、CreativeStrategyAgent、VisualBibleAgent、ScriptAgent、StoryboardAgent 等分阶段规则函数，无需外部 API。

真实 LLM 模式（配置后启用）：通过环境变量 REAL_LLM_API_KEY 配置后，系统调用真实 LLM 生成创意草稿，包括标题、hook、广告词、CTA、VisualBible 和分镜脚本。

切换机制：未配置 Key 时自动使用规则型 Pipeline；配置 Key 时优先调用 LLM，失败时 fallback 到规则型。对前端完全透明，返回的 CreativePlan 结构一致。

安全保障：LLM 输出必须经过 JSON 解析和 schema 校验；校验失败时 fallback，不让接口崩溃；不记录完整原始响应到前端。

---

## 素材传入 Seedance

图片素材：用户上传的图片会读取为 base64 格式，作为 image_url 内容块传给 Seedance API。有 10MB 大小限制，超限或读取失败时降级为素材描述注入 prompt。

视频素材：Day 9 暂通过 aiDescription 和 tags 注入 prompt，后续支持抽关键帧转图片 reference。

失败保护：素材读取失败不影响视频生成，自动降级到纯 prompt 模式。

---

## 双链路保持

有 SEEDANCE_API_KEY 时走 Seedance 远端生成，无 Key / 失败 / 超时时自动降级到 FFmpeg 兜底。整片 render 链路不受 LLM 和素材传入的影响。

---

## 仍需 Day10 处理

1. 视频素材抽关键帧转图片 reference
2. 分镜级渲染接口完善
3. LLM 输出质量调优（prompt engineering）
4. 对象存储接入，支持公网 URL 传入
