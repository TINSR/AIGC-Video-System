# 已知边界与诚实说明

> 答辩与文档中应明确以下限制，避免过度承诺。

---

## 1. 视频生成模式

| 边界 | 说明 |
|------|------|
| Seedance 主链路 | 当前以 **整片 Prompt + first frame** 单次生成为主，非逐分镜独立 Seedance 片段拼接 |
| 智能剪辑 | 对**商家已有素材**切片后重新拼接，不是 AI 凭空生成全新画面 |
| 分镜预览 | 单分镜 preview 可走 Seedance 或 FFmpeg，**不是**默认整片主链路 |
| FFmpeg fallback | 演示环境可开；生产建议关闭（`ALLOW_FFMPEG_FALLBACK=false`） |

## 2. 参考视频

- 保存的是**结构化分析报告**（Hook、卖点、分镜摘要等），用于灵感与模板。
- **不复刻、不混剪**参考视频原片内容。
- 平台 URL 导入能力有限，以 merchant_upload 与手动 URL 为主。

## 3. 数据与推荐

- 数据看板指标来自 **Mock 种子或 CSV 导入**，非真实抖音/TikTok 交易后台。
- 模板推荐为规则 + Mock 历史表现，**非**在线 A/B 真实回流。
- 未接入向量检索、未实现 RAG 知识库。

## 4. 平台与账号

- **无**真实抖音 OAuth、无店铺 API 对接。
- OSS / Seedance / Doubao / MiMo 均依赖各自账号配额与计费。

## 5. 基础设施

| 组件 | 边界 |
|------|------|
| Redis | **可选**；版本不足时 BullMQ worker 不启动，任务仍在 API 内执行 |
| MySQL | 本地演示可用 `db push`；正式环境应使用 migration |
| 多画幅 | 当前主演示 9:16；16:9 等需按代码实际支持情况描述 |

## 6. 智能剪辑算法

- 镜头边界检测依赖 FFmpeg `select=gt(scene)`，低运动视频可能退化为**固定时长切片**。
- Clip 视觉理解：配置 Doubao 时质量更高；未配置时使用 RuleBased fallback。
- `transition`（fade/zoom）在部分版本为 concat 拼接，转场特效非全部实现。
- 手动 override clip 为 **P1** 能力，需前后端联调后使用。

## 7. TTS / 字幕 / BGM

- 字幕烧录依赖 FFmpeg subtitles 滤镜；Windows 字体/路径异常时可能**回退为无字幕片段**。
- Xiaomi MiMo TTS 依赖有效 Key、模型权限与额度；`tp-` 与标准 Key endpoint 不同。
- BGM 为可选占位，未配置时不影响任务 success（无背景音乐）。

## 8. 性能与耗时

- Seedance 整片生成常需 **1–15 分钟**，受模型侧排队影响。
- 智能剪辑本地 FFmpeg 合成通常 **秒级~分钟级**，取决于素材数量与分辨率。
- 并发生成未做大规模压测，比赛演示建议**单任务串行**。

## 9. 安全

- API 无完整鉴权体系，面向比赛演示环境。
- 切勿在 README、截图、QQ 中泄露 `.env` 与 Key。

## 10. 文档与基线

- 最终功能以 `codex/day17-final-integration` 为准。
- 部分早期任务书端口写 3101，**实际代码默认 PORT=3001**，以 `.env.example` 为准。
