# Agent C Day 5 任务书：多 Agent CreativePlan Pipeline

> 角色：AI/CreativePlan Agent
> 建议分支：`feature/day5-multi-agent-pipeline`
> 基线：`origin/codex/integrate-ai-video`，HEAD `d19fda3`
> 目标：把 CreativePlan 生成从“一次性生成”升级为可解释的多 Agent Pipeline，但保持现有 API 和前端契约稳定。

---

## 1. 核心原则

```text
多 Agent 是 AI 模块内部实现。
前端仍然只消费 CreativePlan。
POST /api/products/:productId/creative-plans/generate 不变。
MockAiProvider 保留为 fallback。
```

不要把每个 Agent 的完整输出都返回给前端。

---

## 2. P0：新增 CreativePlanPipeline

建议新增：

```text
apps/api/src/modules/creative-plans/CreativePlanPipeline.ts
```

推荐内部阶段：

```text
Product Analyst
Creative Strategy
Visual Bible
Script
Storyboard
Seedance Prompt
Compliance
Continuity
Revision
```

Day5 可以用模板/规则实现，不要求每个 Agent 都真实调用 LLM。

---

## 3. P0：输出仍然是 CreativePlanDraft

Pipeline 最终输出：

```text
CreativePlanDraft
```

然后交给现有 `CreativePlanService` 组装 id、status、createdAt、scene.id。

不要让外部 API 感知 pipeline 内部结构。

---

## 4. P0：scene goal 与 VisualBible 注入

每个 scene 必须有明确目标：

```text
1 个分镜：full_demo
2 个分镜：hook/feature + cta
3 个分镜：hook + feature/proof + cta
4 个分镜：hook + feature + proof + cta
```

如果 shared 类型暂时没有 `scene.goal`，可以先把 goal 写入：

```text
visualDescription
seedancePrompt
agentTrace
```

每个 `scene.seedancePrompt` 必须包含：

```text
VisualBible.productAppearance
VisualBible.style
VisualBible.colorTone
VisualBible.cameraStyle
VisualBible.continuityRules
当前 scene 目标
当前 scene 画面
字幕/旁白
```

---

## 5. P0：合规与连贯性继续运行

继续复用：

```text
ComplianceAgent
ContinuityAgent
```

RevisionAgent 最多自动修一轮。

可自动修：

- 广告法低风险词替换。
- 缺 transition。
- duration 超出范围。
- prompt 缺 VisualBible。

不可自动决定的内容保留 warning，交给用户审核。

---

## 6. P1：AgentTrace 摘要

输出轻量 trace，不输出完整大 JSON。

示例：

```json
[
  {
    "agent": "Product Analyst",
    "status": "success",
    "summary": "识别目标用户为上班族和健身人群",
    "durationMs": 120
  },
  {
    "agent": "Continuity",
    "status": "warning",
    "summary": "Scene 3 缺少商品外观描述，已自动补充"
  }
]
```

可以先写入：

```text
CreativePlan.promptTrace
```

或暂时保存在返回对象的 optional 字段。

---

## 7. P1：支持 1-4 个分镜

最终分镜数不是固定 4。

规则：

```text
minScenes = 1
maxScenes = 4
defaultScenes = 4
totalDuration <= 15
```

如果前端还没有 sceneCount 输入，Day5 默认仍为 4。

---

## 8. 禁止事项

- 不改 generate API 路径。
- 不破坏现有 MockAiProvider fallback。
- 不让某个 Agent 失败导致 API 整体崩溃。
- 不提交 API Key。
- 不在 logs/trace 里输出密钥。
- 不把完整 LLM 原始输出返回给前端。

---

## 9. 验收标准

- [ ] `npm.cmd --prefix apps/api run build` 通过。
- [ ] `POST /api/products/:productId/creative-plans/generate` 可用。
- [ ] 返回 CreativePlan 仍包含 scenes。
- [ ] 每个 scene prompt 包含 VisualBible 信息。
- [ ] scenes 有明确 hook/feature/proof/cta 或 full_demo 目标。
- [ ] Compliance/Continuity 仍运行。
- [ ] approve/render 不坏。
- [ ] Seedance/fallback 不坏。
