# 技术难点与解决方案

> 基于 ClipShop AI 实际实现，面向比赛答辩与工程说明。

---

## 难点 1：长耗时 Seedance 任务的轮询与失败兜底

### 问题

Seedance 1.5 为远端异步视频生成，单次任务可能耗时数分钟；网络波动、配额或模型不可用会导致失败。用户需要可理解的进度与可恢复的失败策略。

### 原因

- 远端 API 返回 taskId，需轮询直到 terminal 状态。
- 生成结果 URL 需下载落盘到 `outputs/` 才能通过本服务静态访问。
- 生产与演示对 fallback 策略要求不同。

### 解决方案

- `GenerationTask` 持久化 status、progress、currentStep、logs。
- `RenderService` 分阶段更新进度（0→100），每步 sync 到 MySQL。
- Seedance 轮询可配置 `SEEDANCE_POLL_INTERVAL_MS`、`SEEDANCE_POLL_TIMEOUT_MS`。
- 失败时根据 `ALLOW_FFMPEG_FALLBACK` 决定是否走 `FFmpegComposeProvider.generateFromPlan` 兜底。
- `retryTask` 按 `renderMode` 区分 Seedance 与 smart_clip_edit 路径。

### 最终效果

任务页可轮询看到阶段日志；Seedance 成功则输出 `/outputs/{id}.mp4`；失败时有明确 errorMessage，演示环境可 fallback 到 FFmpeg。

---

## 难点 2：多 Agent 结构化 JSON 输出与 fallback

### 问题

CreativePlan 需要 VisualBible、分镜、Seedance Prompt 等结构化字段；LLM 输出不稳定时不能阻塞演示。

### 原因

- 字段多、约束严（scene.goal、transition、materialId 等）。
- LLM 可能超时、返回非 JSON 或幻觉 materialId。

### 解决方案

- `CreativePlanPipeline` 分阶段 Agent：ProductAnalyst → Strategy → VisualBible → Script → Storyboard → SeedancePrompt → Revision。
- 每阶段写入 `agentTrace`，便于前端展示与答辩解释。
- 配置 `REAL_LLM_*` 时优先 `RealLLMProvider`，失败回退规则 Pipeline。
- `creativePlan.service` 对 scene 字段做严格校验；Compliance / Continuity Agent 补充 warnings。

### 最终效果

无 Key 时规则 Pipeline 仍可生成完整方案；有 Key 时提升文案质量；trace 可解释「谁做了什么」。

---

## 难点 3：智能素材剪辑（切片、理解、选镜、合成）

### 问题

商家上传的是原始图片/长视频，需自动切成可用 clip，再与 CreativePlan 分镜匹配，最终 FFmpeg 合成 9:16 成片，并支持人工替换。

### 原因

- 视频镜头边界不固定；纯规则切片与语义理解需配合。
- 分镜 goal、关键词、时长约束与 clip 属性多维匹配。
- Windows 路径、字幕烧录失败易导致整任务失败。

### 解决方案（day17 基线）

- **切片**：`SceneBoundaryDetector`（FFmpeg scene detect）+ 固定时长 fallback；图片包装为 image clip。
- **理解**：`DoubaoClipUnderstandingProvider` / RuleBased fallback，输出 summary、tags、sceneType、visualQuality。
- **选镜**：`SceneClipMatcher` + `GlobalSceneClipOptimizer`（Beam Search、重复惩罚）；支持 `overrides` 手动替换。
- **合成**：`FFmpegComposeProvider.generateFromSmartEdit`（裁剪、zoompan、字幕、concat）；Windows concat 路径归一化；字幕失败回退无字幕片段。
- **持久化**：`MaterialClip`、`SceneClipMatch` 表；plan 返回 `sceneSubtitle` / `sceneDuration`。

### 最终效果

Review 页可「分析素材 → 查看匹配原因 → 智能剪辑成片」；override 后重新匹配；与 Seedance 共用 CreativePlan 但 provider 独立。

---

## 难点 4：素材公网访问与 OSS 边界

### 问题

Seedance / Doubao 等远端服务无法访问开发者本机 `localhost` 或 `/uploads` 相对路径。

### 原因

- 模型 API 需要 HTTP(S) 可访问的 image/video URL。
- 本地路径若传入远端会导致生成失败或静默降级。

### 解决方案

- 上传后尝试写入阿里云 OSS，Material 增加 `publicUrl`、`cloudStatus`。
- Seedance adapter 优先 `material.publicUrl`；本地 Base64 仅 `SEEDANCE_ALLOW_BASE64_DEBUG` 调试开关。
- `publicUrlValidation` 与路径解析防止目录穿越。
- 未配置 OSS 时标记 `local_only`，文档明确演示边界。

### 最终效果

配置 OSS 后远端模型可稳定读图；未配置时本地规则演示仍可用，答辩时诚实说明边界。

---

## 难点 5：任务与方案的数据恢复

### 问题

刷新页面或重启 API 后，商品、方案、任务进度应可恢复，不能仅依赖内存。

### 原因

- 早期 demo 使用 memory-store；长任务跨请求需 DB 同步。

### 解决方案

- Prisma + MySQL 持久化 Product、Material、CreativePlan、Scene、GenerationTask、TaskLog。
- `taskPersistence`：任务变更 upsert DB；`getTaskStatus` 优先读 DB。
- Redis/BullMQ 可选；Redis 不可用时 render 仍在 API 进程执行。
- material-clips / sceneClipMatch 持久化，避免重复 analyze 产生脏数据（force 时先 delete）。

### 最终效果

刷新任务页仍可看到历史任务与 logs；智能剪辑计划可 GET 恢复。

---

## 难点 6：TTS 与多 Provider 合成

### 问题

智能剪辑除画面外，还需可选中文配音，且 MiMo 存在多种 Key 类型与 endpoint。

### 解决方案

- `XiaomiMimoTtsProvider` + `NoopTtsProvider`；`tp-` 前缀 Key 自动走 token-plan 端点。
- TTS 失败不阻塞成片（Noop fallback）；BGM 为可选占位。
- 合成时将 voiceover 音轨与 BGM 混流（配置存在时）。

### 最终效果

配置 MiMo 后 smart_clip_edit 可带配音；未配置时仍输出无音或仅字幕版本。
