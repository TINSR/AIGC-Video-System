# Day 1 总控文档：三 Agent 协作启动指南

> 项目：电商场景 AIGC 带货视频生成系统  
> 目标周期：两周  
> 当前阶段：第 1 天  
> 角色：总控 Agent / 项目负责人使用

---

## 1. Day 1 总目标

第 1 天不追求完整功能，目标是把项目“骨架”和“协作边界”搭起来，避免后面三个人或多个 AI 写出互相对不上的代码。

Day 1 结束时必须有：

- 一个明确的项目目录结构。
- 前端、后端、AI/视频模块的职责边界。
- 共享数据类型草案。
- API 契约草案。
- 2 个 Demo 商品素材包规划。
- 一份可执行的 Day 2 任务清单。

如果今天能初始化代码仓库更好，但不是唯一目标。今天最重要的是让后续开发不乱。

---

## 2. 三个 Agent 分工

| Agent | 负责方向 | Day 1 交付物 |
| --- | --- | --- |
| Agent A | 前端与交互 | 页面结构、路由规划、组件拆分、Mock 数据结构 |
| Agent B | 后端与数据 | 后端目录、数据库模型、API 草案、任务状态设计 |
| Agent C | AI 与视频生成 | Prompt 模板、AI Provider 接口、Seedance 1.5 视频生成方案、FFmpeg 后处理/兜底、Demo 素材需求 |

每个 Agent 必须只负责自己的边界，不要替别人重写整体方案。

---

## 3. 推荐仓库结构

第一天建议使用简单 monorepo：

```text
aigc-video-system/
  apps/
    web/
      src/
        pages/
        components/
        services/
        mocks/
        types/
    api/
      src/
        modules/
          products/
          materials/
          creative-plans/
          render/
          analytics/
        providers/
          ai/
          storage/
        jobs/
        prisma/
  packages/
    shared/
      src/
        types/
        schemas/
  uploads/
    .gitkeep
  outputs/
    .gitkeep
  demo-assets/
    product-juice-cup/
    product-travel-bag/
  docs/
    day1/
    architecture.md
    api.md
    demo-script.md
  README.md
  .env.example
```

如果实际开发工具不方便 monorepo，可以退化为：

```text
frontend/
backend/
packages/shared/
uploads/
outputs/
demo-assets/
docs/
```

但所有 Agent 必须遵守同一套类型和 API 名称。

---

## 4. Day 1 时间安排

### 上午：统一方案

- 阅读 `TWO_WEEK_MVP_IMPLEMENTATION.md`。
- 确认只做 P0 + 少量 P1。
- 确认第 7 天必须跑通端到端链路。
- 确认第一版优先做 9:16 竖版视频。

### 下午：并行产出

- Agent A 写前端页面与组件设计。
- Agent B 写后端 API 与数据库设计。
- Agent C 写 AI/视频合成方案。
- 总控 Agent 合并三方输出，检查字段是否一致。

### 晚上：同步接口

- 对齐共享类型。
- 对齐 API 路径。
- 对齐 Mock 数据。
- 生成 Day 2 开发任务。

---

## 5. Day 1 验收清单

Day 1 结束前逐项检查：

- [ ] 前端页面列表已经确定。
- [ ] 后端 API 路径已经确定。
- [ ] 商品、素材、CreativePlan、分镜、任务 5 个核心数据模型已经确定。
- [ ] AI 剧本输出 JSON 格式已经确定。
- [ ] 视频生成输入格式已经确定。
- [ ] Demo 商品选择已经确定。
- [ ] 三个成员或 Agent 明天各自能直接开工。

---

## 6. 协作规则

- 不要在 Day 1 引入复杂技术，例如 Kubernetes、复杂 Agent 框架、真实电商数据接入。Redis/BullMQ 只用于任务队列和进度，不要扩大范围。
- 所有接口先支持 Mock 数据，真实 AI Key 不作为系统能否启动的前提。
- 所有长任务都必须有失败状态，不能只设计成功路径。
- 所有生成结果都要保存输入、输出和日志，方便答辩展示 Trace。
- 第一天不要追求 UI 精美，先保证页面和数据流明确。

---

## 7. 给总控 Agent 的合并提示词

可以把下面这段发给负责统筹的 AI：

```text
你是项目总控 Agent。请阅读前端、后端、AI/视频三个 Agent 的 Day 1 输出。
你的任务不是重写它们，而是检查三者是否一致：
1. 页面是否能调用后端 API；
2. 后端数据模型是否能保存 CreativePlan、Visual Bible、Seedance Prompt 和审查结果；
3. 视频生成模块需要的字段是否在 CreativePlan/Scene 中存在；
4. Mock 数据是否能支撑前端展示；
5. 是否有超出两周 MVP 的复杂设计。

请输出：
- 冲突清单；
- 需要统一的字段；
- Day 2 每个 Agent 的具体任务；
- 当前最小端到端路径。
```
