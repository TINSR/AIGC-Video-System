# Agent C Day 4 任务书：Seedance 素材一致性与分镜视频方案

> 角色：AI/视频 Agent  
> 建议分支：`feature/day4-seedance-materials`  
> 目标：在真实 Seedance 链路已跑通的基础上，提升商品一致性，并为分镜级视频预览/重生成设计方案。

---

## 1. 当前状态

当前已实现：

- Seedance / 火山方舟真实任务创建。
- 远端任务状态轮询。
- 成功时获取远端 `videoUrl`。
- 无 Key 或失败时 FFmpeg fallback。
- 等待时间已调整到默认 15 分钟。

当前限制：

- 当前主要是文生视频。
- 本地 `/uploads/xxx` 素材无法被火山远端访问。
- 商品一致性不稳定。
- 还没有分镜级视频预览。
- 还没有分镜级视频重生成。

---

## 2. P0：保持 Seedance 和 fallback 双链路

必须保持：

```text
有 SEEDANCE_API_KEY + SEEDANCE_MODEL_ID
-> 调 Seedance
-> 成功则返回远端 videoUrl
```

以及：

```text
无 Key / Seedance failed / Seedance 无 videoUrl
-> FFmpeg fallback
-> 输出本地 mp4
```

不要为了尝试图生视频，把原本可用链路破坏。

---

## 3. P0：优化 Seedance prompt

Day 4 至少优化 prompt 结构，让 Seedance 更稳定理解商品带货场景。

建议 prompt 结构：

```text
商品信息：
- 商品名称
- 核心卖点
- 目标人群

全局视觉设定：
- 商品外观
- 色调
- 镜头风格
- 主场景
- 连贯性规则

分镜脚本：
Scene 1: 时长、画面、字幕、旁白、转场
Scene 2: ...

要求：
- 竖屏 9:16
- 电商带货短视频
- 商品始终清晰可见
- 不要出现与商品外观冲突的元素
- 字幕简洁
- 节奏适合 15 秒短视频
```

注意：不要使用广告法风险词。

---

## 4. P1：素材传递方案

当前本地素材路径不能直接给 Seedance 远端使用。

请输出可执行方案，三选一或组合：

### 方案 A：Base64

适合小图片测试。

优点：

- 不需要对象存储。
- 本地素材可直接编码。

风险：

- 请求体变大。
- 接口是否支持需要验证。

### 方案 B：对象存储公网 URL

例如：

- 火山 TOS
- 阿里 OSS
- 腾讯 COS
- Cloudflare R2

优点：

- 更适合真实项目。

风险：

- 需要配置密钥和 bucket。

### 方案 C：暂时只文生视频，但强化商品描述

优点：

- 不影响当前 demo。

风险：

- 商品一致性有限。

Day 4 如果来不及真实实现，至少要写清楚 Day 5 怎么做。

---

## 5. P1：分镜级视频预览方案

请设计但不强制实现：

```text
POST /api/creative-plans/:id/scenes/:sceneId/render
```

目标：

- 只生成单个 scene 的视频片段。
- 返回 `previewVideoUrl`。
- 前端在分镜剪辑台里预览。
- 用户不满意时只重生成这个 scene。
- 最终 render 可以复用已有 scene 片段。

需要考虑：

- scene preview task 和 full render task 是否共用 `GenerationTask`。
- preview 片段存储在哪里。
- Seedance 失败时是否 scene-level fallback。
- 最终合成时如何按顺序拼接。

---

## 6. P1：task logs 更清楚

请确认 logs 至少能看出：

- Seedance prompt 已构建。
- 是否尝试 Seedance。
- provider task id。
- 轮询状态。
- 是否拿到远端 videoUrl。
- 是否进入 fallback。
- fallback 输出路径。

不要把 API Key 写入 logs。

---

## 7. 允许修改范围

允许：

```text
apps/api/src/providers
apps/api/src/agents
apps/api/src/modules/render
apps/api/src/modules/creative-plans
packages/shared
docs
```

不要修改：

```text
apps/web 页面实现
真实 API Key
```

---

## 8. 验收标准

- [ ] `npm --prefix apps/api run build` 通过。
- [ ] 无 Key 时 fallback 仍可用。
- [ ] 有 Key 时 Seedance 仍能提交任务。
- [ ] Seedance 成功时使用真实远端 videoUrl。
- [ ] Seedance 无 videoUrl 时 fallback。
- [ ] prompt 结构更适合商品带货。
- [ ] 素材传递方案已写清楚。
- [ ] 分镜级视频预览方案已写清楚。
- [ ] logs 不泄露 API Key。

---

## 9. 给 AI/视频 Coding Agent 的提示词

```text
你是 Day 4 AI/视频 Agent。
请基于当前 integration 分支新建 feature/day4-seedance-materials。
当前真实 Seedance 链路已经跑通，但主要是文生视频。
Day 4 目标是提升商品一致性，并为分镜级视频预览/重生成设计方案。

请完成：
1. 保持 Seedance 成功链路和 FFmpeg fallback 双链路；
2. 优化 Seedance prompt 结构，让它更适合电商带货短视频；
3. 不泄露 API Key；
4. 输出素材传递方案：Base64 / 对象存储 URL / 暂时文生视频；
5. 设计 scene-level render 接口和数据流；
6. 优化 task logs，让调试更清楚。

不要破坏当前可用 render，不要提交真实密钥。
完成后输出改动文件、build 结果、Seedance 测试结果、素材方案和分镜预览方案。
```

