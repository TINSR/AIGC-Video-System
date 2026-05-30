# Day 5 集成审查与基线报告

## 当前集成分支

```text
review/day5-full-integration-with-backend
```

## 新基线目标

```text
origin/codex/integrate-ai-video
```

## 集成内容

本次 Day 5 集成包含三部分：

```text
1. Agent C 多 Agent CreativePlan Pipeline
2. 前端 Day 5 审核 / 剪辑 / 任务展示改进
3. 后端 clean persistence 分支
```

关键提交：

```text
947c922 fix: integrate day5 backend persistence cleanly
b2bc769 fix: Day5 contract persistence on clean integrate baseline
9a5db01 feat:shared-add new types
bb2ff4d feat:day5-frontend-review-flow
c06abab fix: VisualBible injection mismatch, add day5 task docs
e05bfa3 feat: day5 multi-agent CreativePlan pipeline skeleton
```

## 审查结论

```text
建议作为新的 Day 5 集成基线。
```

当前代码已经解决此前后端分支的 Git 历史断裂问题，并完成三方代码集成。

旧后端分支问题：

```text
origin/feature/day5-contract-and-persistence
origin/feature/day5-contract-persistence-v2
```

这两个分支存在 unrelated histories / 大面积 add-add 冲突，不再建议使用。

新的后端分支：

```text
origin/feature/day5-backend-persistence-clean
```

已经成功合入当前集成分支。

## 验证结果

已通过：

```bash
npm.cmd --prefix apps/api run build
npm.cmd --prefix apps/web run build
npm.cmd --prefix apps/api run db:generate
git diff --check
```

结果：

```text
API build：通过
Web build：通过
Prisma generate：通过
Whitespace check：通过
```

## Day 5 验收对照

### 构建验收

```text
通过
```

### API 路径

保持不变：

```text
POST /api/products/:productId/creative-plans/generate
GET /api/products/:productId/creative-plans
GET /api/creative-plans/:id
PUT /api/creative-plans/:id
PUT /api/creative-plans/:id/scenes/:sceneId
PUT /api/creative-plans/:id/scenes
POST /api/creative-plans/:id/approve
POST /api/creative-plans/:id/render
GET /api/tasks/:id
```

### AI / CreativePlan Pipeline

已完成：

```text
CreativePlanPipeline 已接入 CreativePlanService。
MockAiProvider fallback 保留。
ComplianceAgent 继续运行。
ContinuityAgent 继续运行。
scene goal 已支持。
scene.seedancePrompt 已注入 VisualBible 核心信息。
agentTrace 使用摘要形式，不包含敏感信息。
```

scene goal 支持：

```text
full_demo
hook
feature
proof
cta
```

prompt 注入内容包括：

```text
VisualBible.productAppearance
VisualBible.style
VisualBible.colorTone
VisualBible.cameraStyle
VisualBible.continuityRules
```

### 前端

已合入 Day 5 前端审核流相关改动。

重点能力：

```text
CreativePlan 审核展示
SceneTimelinePanel
scene 编辑保存
策略审核区域
任务/视频页兼容
新增字段缺失时不应白屏
```

### 后端持久化

已完成：

```text
Prisma schema 增加 Day 5 字段。
新增 migration。
Scene 类型与 shared types 同步。
updateScene / batchUpdateScenes 支持从 getCreativePlan 读取 DB/内存一致视图。
scene.warnings JSON 字段归一化。
错误码区分 NOT_FOUND 和 INVALID_SCENE_UPDATE。
```

新增 migration：

```text
apps/api/prisma/migrations/20260530090000_day5_contract_persistence/migration.sql
```

## 已修复的问题

### 1. shared types 冲突

合并前冲突文件：

```text
apps/api/src/shared/types.ts
packages/shared/src/types/index.ts
packages/shared/src/types.ts
```

处理方式：

```text
保留 Agent C、前端、后端字段并集。
保持 packages/shared/src/types.ts 删除状态，避免维护两套 shared types。
```

### 2. 后端 scene 更新过度依赖内存

修复前：

```text
updateScene / batchUpdateScenes 直接读取 planStore。
服务重启后，如果内存为空但 DB 有数据，会误判方案不存在。
```

修复后：

```text
先调用 getCreativePlan(planId)，优先从 Prisma 读取并同步到内存。
```

### 3. controller 参数校验不足

修复：

```text
batchUpdateScenes 增加 Array.isArray(scenes) 校验。
scene 更新错误码区分 404 和 400。
```

### 4. Prisma schema 缺 migration

修复：

```text
补充 Day 5 contract persistence migration。
```

## 密钥检查

未发现真实 API Key 泄露。

只存在文档和 `.env.example` 中的占位说明：

```text
SEEDANCE_API_KEY=your_api_key_here
SEEDANCE_API_KEY=""
```

## 未完成 / 需继续跟踪

### 1. 完整 HTTP 主链路 smoke test

本地未完成完整运行链路测试：

```text
generate -> update scene -> approve -> render -> get task
```

原因：

```text
本机 Redis 未启动，服务运行时出现 ECONNREFUSED 127.0.0.1:6379。
```

这不是本次 Day 5 集成新增问题，但会影响本地完整联调。

建议 Day 6 或正式合入前，在 Redis / MySQL 环境正常时执行一次完整 smoke test。

### 2. Prisma migration 需要真实数据库验证

已补 migration 和 `db:generate`，但还需要在真实 MySQL 环境执行：

```bash
npm.cmd --prefix apps/api run db:migrate
```

或团队约定的迁移流程。

### 3. Redis 依赖仍需环境说明

当前 Redis 未启动时会有连接失败日志。

建议后续明确：

```text
本地 demo 是否必须启动 Redis。
无 Redis 时是否完全 fallback 到内存任务。
```

### 4. shared types 仍有长期技术债

当前仍同时存在：

```text
apps/api/src/shared/types.ts
packages/shared/src/types/index.ts
```

Day 5 已保持同步，但 Day 6 后建议统一类型来源，减少漂移风险。

## 给 Day 6 规划建议

建议 Day 6 不要大重构，优先做稳定化：

```text
1. 跑完整 HTTP 主链路 smoke test。
2. 在真实 MySQL 上验证 migration。
3. 明确 Redis 可选/必选边界。
4. 检查 render 是否读取保存后的 scenes。
5. 做一次前端真实 API 模式联调。
6. 逐步收敛 shared types，避免双份维护。
```

## 最终结论

```text
当前 Day 5 集成代码符合进入新基线的条件。
```

可以推送到：

```text
origin/codex/integrate-ai-video
```

作为 Day 6 规划和后续联调的共同起点。
