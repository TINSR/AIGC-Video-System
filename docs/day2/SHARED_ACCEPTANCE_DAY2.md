# Day 2 共享验收清单

> 基线分支：`codex/integrate-ai-video`  
> DDL：`2026-05-24 12:00`，Asia/Shanghai

---

## 1. 环境准备

```bash
git fetch origin
git checkout codex/integrate-ai-video
git pull origin codex/integrate-ai-video
npm install
npm --prefix apps/api run db:generate
npm --prefix apps/api run build
npm --prefix apps/web run build
```

API 端口：

```text
3101
```

前端真实 API：

```env
VITE_USE_MOCK=false
VITE_API_BASE_URL=http://localhost:3101/api
```

---

## 2. 后端 API 验收

必须通过：

```text
GET /api/health
GET /api/products/product_001/materials
GET /api/analytics/overview
POST /api/products/product_001/creative-plans/generate
GET /api/products/product_001/creative-plans
GET /api/creative-plans/:id
PUT /api/creative-plans/:id/scenes/:sceneId
POST /api/creative-plans/:id/approve
POST /api/creative-plans/:id/render
GET /api/tasks/:id
```

通过标准：

- CreativePlan 包含 4 个 scenes。
- CreativePlan 展示字段包含 `title`、`hook`、`adCopy`、`cta`、`visualBible`、`warnings`、`scenes`。
- approve 后 `status=approved`。
- render 返回 `GenerationTask`。
- task 可查询。
- failed 状态也必须有明确 `errorMessage` 和 `logs`。

---

## 3. 前端验收

- [ ] mock 模式仍可用。
- [ ] 真实 API 模式可用。
- [ ] CreativePlan 审核页可展示真实数据。
- [ ] 可保存至少一个 scene 修改。
- [ ] approve 按钮可用。
- [ ] render 按钮可用。
- [ ] task 页展示 `status/progress/currentStep/logs/errorMessage/outputVideoUrl`。
- [ ] task failed 时不白屏。
- [ ] Materials 空数组时页面正常。
- [ ] Analytics overview mock/空数据时页面正常。

---

## 4. 视频验收

检查：

```bash
ffmpeg -version
ffprobe -version
```

如果 FFmpeg 可用：

- [ ] fallback 能生成 mp4。
- [ ] `outputVideoUrl` 可访问。
- [ ] outputs 目录出现文件。

如果 FFmpeg 不可用：

- [ ] task failed 原因明确。
- [ ] 文档中说明安装方式。
- [ ] 页面可以展示失败原因。

---

## 5. 能否 PR 到 dev

可以 PR 到 `dev` 的条件：

- API build 通过。
- Web build 通过。
- Materials API 可用。
- Analytics overview 可用。
- 前端真实 API 能跑核心链路。
- FFmpeg 状态清楚：能出片，或有清晰失败/安装说明。

不建议进 `main` 的原因：

- 仍使用 memory store。
- Prisma/BullMQ 未完全整合。
- Seedance 真实 API 未接入。
- 前端真实 API 仍在稳定阶段。
