# Day 4 总控文档：分镜剪辑台与 Seedance 素材一致性增强

> 当前建议基线：`codex/integrate-ai-video`  
> Day 4 主题：把“生成前审核”升级为“轻量分镜剪辑”，同时提升 Seedance 真实生成和商品素材的一致性。  
> 核心原则：不要破坏 Day 3 已经跑通的 Seedance 真实链路和 FFmpeg fallback 链路。

---

## 1. 当前已知状态

Day 3 已经完成：

- 真实 Seedance / 火山方舟任务创建成功。
- Seedance 状态轮询成功。
- Seedance 成功后能拿到远端 `videoUrl`。
- 无 Key 或 Seedance 失败时，仍能进入 FFmpeg fallback。
- FFmpeg fallback 可以输出本地 mp4。
- CreativePlan 已支持 4 个 scenes，总时长约 15 秒。
- 前端已有 CreativePlan 审核、scene 编辑、整体 render 和最终视频查看基础。

当前缺口：

- 前端还没有真正的“分镜剪辑台”。
- 目前更多是文本/提示词审核，不是可视化剪辑。
- 分镜级视频预览大概率尚未实现。
- 分镜级视频重生成尚未实现。
- Seedance 当前主要是文生视频，没有把本地商品素材稳定传给远端。

---

## 2. Day 4 总目标

Day 4 不做专业剪辑器，先做 MVP 级“分镜剪辑台”：

```text
用户可以在生成最终视频前：
1. 查看每个分镜；
2. 调整分镜顺序；
3. 调整时长；
4. 修改字幕/旁白/prompt；
5. 选择或修改转场；
6. 重新生成单个分镜的文案/prompt；
7. 保存后再生成最终视频。
```

对外演示时可以这样表达：

```text
系统支持生成前分镜剪辑：商户可以调整分镜顺序、时长、转场、字幕和提示词，再确认生成视频。
```

---

## 3. 三个 Agent 分工

| Agent | 分支建议 | Day 4 重点 |
| --- | --- | --- |
| Agent A 前端 | `feature/day4-scene-timeline` | 分镜剪辑台 UI、顺序/时长/转场/字幕编辑、保存、生成视频入口 |
| Agent B 后端 | `feature/day4-scene-edit-api` | scene 顺序保存、批量更新 scenes、render 按当前顺序执行、接口稳定 |
| Agent C AI/视频 | `feature/day4-seedance-materials` | Seedance prompt 优化、素材传递方案、分镜级预览/重生成技术方案 |

---

## 4. Day 4 P0 范围

P0 必须完成：

1. 前端有一个明确的 Scene Timeline / 分镜剪辑台。
2. 用户能调整 scene 顺序。
3. 用户能调整 scene 的 `duration`，范围仍为 1-15 秒。
4. 用户能修改 `subtitle`、`voiceover`、`seedancePrompt`、`transition`。
5. 保存后，后端存储的 `scenes` 顺序和内容被更新。
6. 最终 render 使用用户保存后的 scenes。
7. Day 3 链路不坏：
   - Seedance 有 Key 时优先真实调用；
   - Seedance 失败或无 Key 时 fallback；
   - task 能返回清楚状态；
   - mp4 或远端视频 URL 可查看。

---

## 5. Day 4 P1 范围

P1 尽量完成：

- 单个 scene 的“重新生成文案/prompt”按钮，调用已有接口：

```text
POST /api/creative-plans/:id/scenes/:sceneId/regenerate
```

- 后端支持批量更新 scenes：

```text
PUT /api/creative-plans/:id/scenes
```

- 前端支持上移/下移按钮，或者拖拽排序。
- AI/视频输出 Seedance 图生视频或素材传递方案。
- 如果能快速实现，可做 scene-level render 技术预留：

```text
POST /api/creative-plans/:id/scenes/:sceneId/render
```

---

## 6. Day 4 暂不强制做

这些可以放到 Day 5 或之后：

- 专业时间线剪辑器。
- 分镜级真实视频预览。
- 分镜级视频重生成并复用片段合成。
- TTS/BGM 完整功能。
- 对象存储完整接入。
- 多素材图生视频最终效果优化。

---

## 7. 最终验收链路

必须能跑：

```text
打开前端
-> 生成 CreativePlan
-> 进入分镜剪辑台
-> 调整 scene 顺序
-> 修改一个 scene 的字幕/时长/转场/prompt
-> 保存
-> approve
-> render
-> Seedance 成功或 FFmpeg fallback 成功
-> 查看最终视频
```

---

## 8. 给总控 Agent 的提示词

```text
你是 Day 4 集成总控 Agent。
当前项目已完成真实 Seedance 最小链路和 FFmpeg fallback。
Day 4 目标是实现轻量分镜剪辑台，并保持 Day 3 链路不坏。

请重点检查：
1. 前端是否有 Scene Timeline / 分镜剪辑台；
2. 是否能调整分镜顺序、时长、转场、字幕、prompt；
3. 保存后后端 CreativePlan scenes 是否真的更新；
4. render 是否按更新后的 scenes 执行；
5. Seedance 有 Key 时是否仍可调用；
6. Seedance 失败或无 Key 时 fallback 是否仍可用；
7. 是否没有修改已约定 API 路径和共享字段；
8. build 是否通过。

输出：
- P0/P1/P2 问题；
- 是否建议合并到 integration；
- 是否可以进入第一次剪辑功能联调；
- 仍需 Day 5 处理的事项。
```

