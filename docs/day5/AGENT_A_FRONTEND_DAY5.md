# Agent A Day 5 任务书：双审核与前端契约适配

> 角色：前端 Agent
> 建议分支：`feature/day5-frontend-review-flow`
> 基线：`origin/codex/integrate-ai-video`，HEAD `d19fda3`
> 目标：在不破坏现有分镜剪辑台的前提下，为最终版本的“双审核流程”和多 Agent 输出做前端适配。

---

## 1. 当前前端基础

已有：

- CreativePlan 审核页。
- SceneTimelinePanel 分镜剪辑台。
- scene 顺序调整。
- scene 字段编辑。
- 保存剪辑。
- approve。
- render。
- task/video 展示。

Day5 前端不要重做这些。

---

## 2. P0：保持现有剪辑台稳定

必须保证：

- scene 顺序调整仍可用。
- scene 编辑仍可用。
- 保存剪辑仍可用。
- 审核前自动保存仍可用。
- render 前自动保存仍可用。
- task 成功/失败都不白屏。

---

## 3. P0：设计双审核前端流程

最终流程：

```text
策略审核
-> 分镜审核/剪辑
-> 视频生成
```

Day5 最小实现方式：

- 可以先在 CreativePlan 审核页上方增加“创意策略区块”。
- 如果后端还没有独立 `CreativeStrategy` API，可以先从 CreativePlan 推导展示。
- 不强制做新页面。

策略区块建议展示：

```text
视频目标
目标人群
卖点顺序
情绪节奏
推荐分镜数
风格方向
```

如果字段还没真实返回，可以先做好组件结构和空状态。

---

## 4. P1：适配预留字段

如果后端/共享类型新增以下字段，前端要优雅展示：

```text
scene.goal
scene.materialUsage
creativePlan.agentTrace
creativePlan.renderMode
creativePlan.stage
```

展示建议：

- `scene.goal`：在分镜卡片上显示标签，例如 `hook / feature / proof / cta`。
- `scene.materialUsage`：显示素材用途，例如 `参考图 / 源视频 / 关键帧 / 仅提示词`。
- `agentTrace`：做折叠步骤条，不展示完整 Agent JSON。
- `stage`：显示当前处于策略审核、分镜审核、已审核、生成中等状态。

注意：字段不存在时不能白屏。

---

## 5. P1：生成进度体验设计

最终版本需要两类进度：

```text
CreativePlan 生成进度
Render 视频生成进度
```

Day5 前端可以先设计 UI 或 fake progress：

```text
商品分析中
创意策略生成中
视觉风格设定中
分镜脚本生成中
Seedance Prompt 生成中
合规检查中
连贯性检查中
方案已生成
```

不要把每个 Agent 的完整输出推给用户。

---

## 6. 禁止事项

- 不修改后端 API 路径。
- 不删除现有剪辑台。
- 不把 Agent 中间 JSON 直接全部展示给用户。
- 不要求后端 Day5 必须完成所有新 API。
- 不提交 `.env` 或密钥。

---

## 7. 验收标准

- [ ] `npm.cmd --prefix apps/web run build` 通过。
- [ ] 现有 CreativePlan 审核页仍可用。
- [ ] SceneTimelinePanel 仍可保存并排序。
- [ ] 字段缺失时不白屏。
- [ ] 预留策略审核展示位置。
- [ ] 可展示 `scene.goal`，如果后端返回。
- [ ] task/video 页面不被破坏。
