# Day 5 共享验收清单

> 基线：`origin/codex/integrate-ai-video`
> HEAD：`d19fda3 fix: stabilize day5 baseline integration`

---

## 1. 分支要求

所有 Day5 分支必须从当前基线新开：

```bash
git fetch origin
git checkout codex/integrate-ai-video
git pull origin codex/integrate-ai-video
git log --oneline -1
```

应看到：

```text
d19fda3 fix: stabilize day5 baseline integration
```

不要继续使用已知破坏性的后端重写分支。

---

## 2. 构建验收

必须通过：

```bash
npm.cmd --prefix apps/api run build
npm.cmd --prefix apps/web run build
git diff --check
```

如修改 Prisma：

```bash
npm.cmd --prefix apps/api run db:generate
```

---

## 3. 核心链路验收

必须通过：

```text
GET /api/health
POST /api/products/product_001/creative-plans/generate
PUT /api/creative-plans/:id
POST /api/creative-plans/:id/approve
POST /api/creative-plans/:id/render
GET /api/tasks/:id
```

必须确认：

- CreativePlan 可生成。
- 分镜剪辑台可保存 scenes。
- approve 前后状态正确。
- render 使用保存后的 scenes。
- task 可查询。
- Seedance / FFmpeg fallback 双链路不被破坏。

---

## 4. 前端验收

- [ ] SceneTimelinePanel 仍可用。
- [ ] 保存剪辑仍可用。
- [ ] 审核前自动保存仍可用。
- [ ] render 前自动保存仍可用。
- [ ] 新增字段缺失时不白屏。
- [ ] 策略审核区域或设计已完成。
- [ ] task/video 页面正常。

---

## 5. 后端验收

- [ ] 已有 routes 没有被删除。
- [ ] API 路径没有被改名。
- [ ] 可选字段不破坏现有前端。
- [ ] 无数据库时 fallback 不崩。
- [ ] 没有半迁移 BullMQ/Prisma render。
- [ ] 没有提交密钥。

---

## 6. AI 验收

- [ ] CreativePlanPipeline 可运行，或至少 skeleton 已接入。
- [ ] generate API 不变。
- [ ] MockAiProvider fallback 保留。
- [ ] 每个 scene prompt 注入 VisualBible。
- [ ] Compliance/Continuity 继续运行。
- [ ] AgentTrace 只保存摘要，不输出敏感内容。
- [ ] Revision 不无限循环。

---

## 7. 是否可以合并

可以合并到 integration 的条件：

- build 全部通过。
- 主链路通过。
- 剪辑台不坏。
- Seedance/fallback 不坏。
- 没有 API Key 泄露。
- 没有破坏性后端重写。

不能合并的 P0：

- 删除或注释已有 routes。
- build 失败。
- generate/approve/render 任何一环断掉。
- scenes 保存后丢失或 render 不读取。
- 密钥泄露。
