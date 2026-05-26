# Agent A Day 4 任务书：分镜剪辑台前端

> 角色：前端 Agent  
> 建议分支：`feature/day4-scene-timeline`  
> 目标：把 CreativePlan 审核页升级为轻量分镜剪辑台，让用户能在生成视频前调整分镜。

---

## 1. 当前问题

现在前端大概率已有：

- CreativePlan 展示。
- scene 字段编辑。
- approve。
- render。
- 最终视频查看。

但还缺少真正的剪辑体验：

- 没有清楚的分镜时间线。
- 不能调整分镜顺序。
- 转场、时长、字幕、prompt 的编辑感不强。
- 用户很难理解“剪辑”在哪里发生。

---

## 2. P0：实现 Scene Timeline / 分镜剪辑台

新增或改造一个页面区域，展示所有 scenes。

每个 scene 卡片必须展示：

- 分镜序号。
- `duration`
- `transition`
- `subtitle`
- `voiceover`
- `visualDescription`
- `seedancePrompt`
- warnings，如果有。

建议布局：

```text
[Scene 1] -> [Scene 2] -> [Scene 3] -> [Scene 4]
```

移动端或窄屏可以纵向排列。

---

## 3. P0：支持编辑

每个 scene 至少支持编辑：

- `duration`
- `transition`
- `subtitle`
- `voiceover`
- `seedancePrompt`

时长限制：

```text
1 <= duration <= 15
```

总时长建议显示出来：

```text
总时长：15s
```

如果超过 15s，要给出提示，但不要让页面崩溃。

---

## 4. P0：支持调整顺序

至少实现一种：

```text
上移 / 下移按钮
```

如果时间足够，再做拖拽排序。

调整顺序后，必须能保存到后端。

保存后刷新页面，顺序不能丢。

---

## 5. P0：保存与生成

用户操作路径：

```text
编辑分镜
-> 保存剪辑
-> approve
-> render
```

要求：

- 保存中有 loading。
- 保存成功有提示。
- 保存失败有提示。
- 未保存时点击 render，要提醒先保存或自动保存。

---

## 6. P1：单分镜重新生成文案/prompt

如果后端已有：

```text
POST /api/creative-plans/:id/scenes/:sceneId/regenerate
```

则前端可以给每个 scene 加：

```text
重新生成文案/提示词
```

注意：这个按钮目前不是重新生成视频片段，而是重新生成 scene 文案、描述和 prompt。

---

## 7. 暂不强制

Day 4 不强制实现：

- 每个分镜的视频预览。
- 拖拽式专业时间线。
- 分镜级视频重生成。
- 多轨道音频剪辑。

---

## 8. 允许修改范围

允许：

```text
apps/web
packages/shared
docs
```

不要修改：

```text
apps/api 路由实现
prisma/schema.prisma
Seedance API Key
```

如果需要新接口，先写清楚需求给后端 Agent。

---

## 9. 验收标准

- [ ] `npm --prefix apps/web run build` 通过。
- [ ] 页面有明确分镜剪辑台。
- [ ] 能编辑 scene duration/transition/subtitle/voiceover/seedancePrompt。
- [ ] 能调整 scene 顺序。
- [ ] 能保存剪辑。
- [ ] 保存后刷新顺序和内容不丢。
- [ ] approve/render 链路仍可用。
- [ ] task 成功后能查看最终视频。

---

## 10. 给前端 Coding Agent 的提示词

```text
你是 Day 4 前端 Agent。
请基于当前 integration 分支新建 feature/day4-scene-timeline。
Day 4 目标是实现轻量分镜剪辑台，不是专业剪辑器。

请实现：
1. Scene Timeline / 分镜剪辑台；
2. 展示每个 scene 的 duration、transition、subtitle、voiceover、visualDescription、seedancePrompt；
3. 支持编辑 duration、transition、subtitle、voiceover、seedancePrompt；
4. 支持上移/下移调整分镜顺序；
5. 支持保存剪辑；
6. 保存后 approve/render 仍可用；
7. 如接口已支持，增加“重新生成文案/提示词”按钮。

不要修改后端 API 路径，不要做专业剪辑器，不要提交密钥。
完成后输出改动文件、build 结果、演示步骤和仍需后端配合的点。
```

