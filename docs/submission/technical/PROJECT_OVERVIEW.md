# ClipShop AI - 电商场景 AIGC 带货视频生成系统

> 一句话价值：面向电商商家的可审核 AIGC 视频创作系统，从商品素材理解、参考视频拆解、多 Agent 剧本生成，到 Seedance 成片和真实素材智能剪辑，完成端到端带货视频生产。
>
> 本文档描述 **ClipShop AI 整体项目**（功能、架构、启动与分工），供评委与后续维护者阅读；其中「成员分工」区分日常开发职责与比赛最终材料分工，见第 14 节。

| 项目 | 说明 |
|------|------|
| 仓库 | https://github.com/TINSR/AIGC-Video-System |
| 最终基线 | `codex/day17-final-integration` |
| 参赛课题 | 电商 AIGC 带货视频生成（商家素材 + AI 创意 + 可控成片） |

---

## 1. 项目简介

ClipShop AI 是一个面向电商商家的带货视频创作系统。商家上传商品图片与视频后，系统可完成素材角色识别、参考视频结构化拆解、灵感模板推荐、多 Agent 生成可审核的 CreativePlan，并支持两条成片链路：

- **Seedance AI 生成**：基于分镜 Prompt 调用 Seedance 1.5 生成创意视频。
- **智能素材剪辑**：对商家真实素材切片、理解、选镜，经 FFmpeg 拼接输出可控成片。

系统同时提供任务进度、失败兜底、视频预览与 Mock/CSV 数据看板，便于演示完整创作闭环。

## 2. 赛题要求对应关系

| 比赛要求 | 项目实现 |
|----------|----------|
| 商品素材上传 | 图片/视频上传、`/uploads` 静态访问、OSS 公网 URL、本地 fallback |
| 剧本生成 | CreativePlan Pipeline（多 Agent 或 Real LLM） |
| 基础分镜 | 1–4 个可编辑 Scene，支持 goal、字幕、配音、Prompt、时长 |
| 一键成片 | `POST /creative-plans/:id/render`（Seedance / smart_clip_edit） |
| 任务进度 | GenerationTask、TaskLog、任务页轮询 |
| 预览导出 | `/outputs/*.mp4`、视频预览页 |
| 智能剪辑 | MaterialClip 分析、SceneClipMatch、FFmpeg 合成、手动 override |
| 分镜编辑 | 台词、字幕、Seedance Prompt、时长、素材替换 |
| TTS/字幕/BGM | Xiaomi MiMo TTS（可选）、字幕烧录、BGM 占位 |
| Trace | agentTrace、promptTrace、任务日志 |
| 数据看板 | Mock/CSV 指标导入、模板排行与对比 |
| 合规审核 | ComplianceAgent（规则校验 + warnings） |



## 3. 核心功能

1. 商家商品图片和视频上传、OSS 管理、主图识别与素材角色分析。
2. 参考视频结构化拆解，提取 Hook、卖点、风格、分镜和 CTA。
3. 灵感模板沉淀、模板推荐和历史效果说明。
4. 多 Agent 生成可审核的 CreativePlan、VisualBible 和分镜脚本。
5. Seedance AI 视频生成与商家素材智能剪辑双模式。
6. 长任务追踪、失败兜底、视频预览和 Mock 数据回流。

## 4. 用户使用流程

```text
工作台 → 创建商品 → 上传素材 → 确认主图
→ 参考视频库 / 灵感模板库
→ 生成 CreativePlan → 审核策略与分镜
→ 选择 Seedance 成片 或 智能素材剪辑
→ 查看任务进度 → 预览成片 → 数据看板
```


## 5. 系统架构（概览）

```text
React Web (5173)
    ↓ REST
Express API (3001)
    ├─ CreativePlan Pipeline（多 Agent / Real LLM）
    ├─ Smart Edit Pipeline（切片 / 理解 / 选镜 / FFmpeg）
    ├─ RenderService（Seedance / smart_clip_edit）
    └─ Analytics / ReferenceVideo / Templates
    ↓
MySQL + Prisma | Redis（可选）| 阿里云 OSS | uploads / outputs
    ↓
Doubao / Seedance / Xiaomi MiMo TTS / FFmpeg
```

本章为系统架构的文字概览。答辩材料中另附 `系统总架构图.png` 作为图示补充，与上文描述一致。

## 6. 多 Agent 工作流

规则型 Pipeline（LLM 未配置或失败时 fallback）：

```text
ProductAnalystAgent
→ CreativeStrategyAgent
→ VisualBibleAgent
→ ScriptAgent
→ StoryboardAgent
→ SeedancePromptAgent
→ RevisionAgent
→ 用户审核
→ Seedance 或 Smart Clip Edit
```

LLM 可用时优先走 RealLLMProvider，失败回退规则 Pipeline。Compliance / Continuity 在审核与修订阶段补充 warnings。

## 7. 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 18、TypeScript、Vite、Ant Design、ECharts |
| 后端 | Node.js、Express、TypeScript、Prisma |
| 数据库 | MySQL |
| 队列 | Redis + BullMQ（可选，版本不足时降级为进程内执行） |
| 视频 | FFmpeg / FFprobe、Seedance 1.5 |
| AI | Doubao 多模态、Xiaomi MiMo TTS |
| 存储 | 本地 uploads/outputs、阿里云 OSS |

## 8. 项目目录

```text
AIGC-Video-System/
├─ apps/api/          # Express 后端
├─ apps/web/          # React 前端
├─ packages/shared/   # 共享类型
├─ tools/             # smoke / regression 脚本
└─ docs/              # 部分 Day 文档（以仓库实际为准）
```

## 9. 环境依赖

- Node.js 18+（建议 LTS）
- npm 9+
- MySQL 8+
- FFmpeg + FFprobe（智能剪辑与 fallback 必需）
- Redis 5+（**可选**，用于 BullMQ 渲染队列；不可用时任务仍在 API 进程内执行）

外部服务（演示可选）：Doubao、Seedance、阿里云 OSS、Xiaomi MiMo TTS。

## 10. 快速启动

详见 `运行与部署说明.md`。摘要：

```powershell
npm install
npm.cmd --prefix apps/api run db:generate
npx.cmd --prefix apps/api prisma migrate deploy
# 本地演示若 migration 受阻：npx.cmd --prefix apps/api prisma db push

npm.cmd --prefix apps/api run dev
npm.cmd --prefix apps/web run dev
```

- 前端：http://localhost:5173
- 后端健康检查：http://localhost:3001/api/health

## 11. 演示流程

1. 创建商品「清爽蓬松洗发水」，上传主图与短视频。
2. 确认主图，可选参考视频分析与模板推荐。
3. 生成并 approve CreativePlan。
4. **Seedance 路径**：Review 页发起整片渲染，任务页等待 success，打开 `/outputs/{taskId}.mp4`。
5. **智能剪辑路径**：分析素材 clips → 查看匹配 → `renderMode=smart_clip_edit` 成片。
6. 打开数据看板查看 Mock 指标。

## 12. 关键工程难点

详见 `技术难点与解决方案.md`（Seedance 长任务、多 Agent 结构化输出、智能剪辑、OSS 公网边界、持久化恢复）。

## 13. 已知边界

详见 `已知边界.md`。

## 14. 团队成员与分工

本项目由 **三名成员** 协作完成。日常开发按 **前端 / 后端 / AI·视频** 三模块划分（文档中常称 Agent A / B / C）；比赛最终交付阶段另有文档与演示材料的分工，二者不应混为一谈。

### 14.1 项目开发与模块分工

| 模块 | 负责成员 | 主要职责 | 主要代码范围 |
|------|----------|----------|--------------|
| **前端** | 队友 A（Agent A） | 工作台与商品/素材页、CreativePlan 审核与分镜编辑、任务进度与成片预览、参考视频库与灵感模板库 UI、数据看板、智能剪辑交互、演示流体验优化 | `apps/web/`、`packages/shared/`（前端共用类型） |
| **后端 API 与数据** | 队友 B（Agent B） | Express 模块与路由、Prisma/MySQL 持久化、商品/素材/CreativePlan/Scene/任务 CRUD、Render 任务编排、MaterialClip 与 Smart Edit 模块、Analytics/参考视频/模板后端、OSS 边界与 smoke/regression 脚本 | `apps/api/src/modules/`、`prisma/`、`tools/` |
| **AI / 视频 Provider** | 队长（Agent C） | 多 Agent CreativePlan Pipeline、Doubao 多模态与参考视频理解、Seedance 1.5 接入、Xiaomi MiMo TTS、FFmpeg 合成与 fallback、Compliance/Continuity Agent、智能剪辑分析与选镜 Provider | `apps/api/src/providers/`、`apps/api/src/agents/`、render 视频链路 |
| **集成与发布** | 队长 | 集成分支维护（如 `codex/integrate-ai-video` → `codex/day17-final-integration`）、PR 合并与联调验收、演示环境 Key 配置、阻塞问题裁定 | 跨模块协调、GitHub 仓库治理 |

**按功能域归纳（全项目范围，非仅某一人最终汇报任务）：**

- **商品与素材**：上传、主图确认、OSS 公网 URL、素材角色分析（前端 UI + 后端 API + Doubao Provider）。
- **参考视频与灵感模板**：URL/本地上传、结构化拆解、模板库与推荐（前端展示 + 后端 CRUD + Doubao/规则 Provider）。
- **CreativePlan 与分镜**：多 Agent 或 Real LLM 生成、双阶段审核、分镜编辑与保存（Pipeline + 前后端契约）。
- **成片双模式**：Seedance AI 生成与 `smart_clip_edit` 智能素材剪辑（RenderService + FFmpeg + 前端任务页）。
- **任务与数据**：GenerationTask/TaskLog、进度轮询、Mock/CSV 指标看板（后端持久化 + 前端 Analytics）。

协作方式：各成员在 `feature/dayN-*` 分支开发，经 Pull Request 合入集成基线；模块边界见 `docs/GITHUB_COLLABORATION_AND_DELIVERY.md` 与各 Day 总控文档。

### 14.2 比赛最终材料分工（交付阶段）

功能开发已冻结后，三人分工侧重于 **整理与提交答辩材料**，与上表开发职责不同：

| 成员 | 最终材料职责 |
|------|----------------|
| 队友 A | 前端截图包、3–8 分钟演示录屏、前端验收问题记录 |
| 队友 B | README、运行说明、API 清单、Agent/ER 图、技术难点、已知边界、技术验收记录 |
| 队长 | 真实能力复核（Seedance/智能剪辑/TTS 等）、生成样片、比赛提报表填写、材料汇总上传 |

（成员姓名与学校信息由队长在比赛提报表中填写。）

## 15. 项目链接

- GitHub：https://github.com/TINSR/AIGC-Video-System
- 最终集成基线：`codex/day17-final-integration`
- 开发记录示例（Day16 智能剪辑后端 PR）：https://github.com/TINSR/AIGC-Video-System/pull/30
- 详细 API：`API清单.md`
- 运行与环境：`运行与部署说明.md`
- 验收记录：`最终技术验收记录.md`
