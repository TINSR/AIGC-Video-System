# Agent B Day 4 任务书：分镜剪辑 API 与渲染顺序保障

> 角色：后端 Agent  
> 建议分支：`feature/day4-scene-edit-api`  
> 目标：支持前端保存分镜剪辑结果，并保证 render 使用用户编辑后的 scenes。

---

## 1. 当前后端基础

当前已有或应已有：

- CreativePlan generate/list/get。
- 单个 scene 更新：

```text
PUT /api/creative-plans/:id/scenes/:sceneId
```

- 单个 scene 重新生成文案/prompt：

```text
POST /api/creative-plans/:id/scenes/:sceneId/regenerate
```

- approve。
- render。
- Seedance 真实链路。
- FFmpeg fallback。

---

## 2. P0：保证 scene 顺序可保存

前端需要调整分镜顺序。

后端必须保证：

- scenes 数组的顺序可以被保存。
- get CreativePlan 时返回保存后的顺序。
- render 时按当前 scenes 顺序执行。

如果当前 `PUT /api/creative-plans/:id` 已支持更新完整 scenes，可以继续使用。

如果不稳定，建议新增：

```text
PUT /api/creative-plans/:id/scenes
```

请求体建议：

```json
{
  "scenes": [
    {
      "id": "scene_1",
      "duration": 4,
      "transition": "cut",
      "subtitle": "新字幕",
      "voiceover": "新旁白",
      "seedancePrompt": "新提示词"
    }
  ]
}
```

注意：不要自创和共享类型冲突的字段。

---

## 3. P0：校验规则

保存 scenes 时必须校验：

- scene id 存在。
- `duration` 在 1-15 秒。
- `transition` 不能为空。
- `subtitle` 可以为空但必须是字符串。
- `voiceover` 可以为空但必须是字符串。
- `seedancePrompt` 不能为空。
- 不允许把其他 plan 的 scene 混进来。

建议校验总时长：

```text
totalDuration <= 15
```

如果超过，可以返回 warning 或 400。以不破坏前端演示为优先。

---

## 4. P0：render 使用更新后的 scenes

必须验证：

```text
调整 scene 顺序
-> 保存
-> get CreativePlan
-> approve
-> render
```

render 时使用的 scene 顺序必须是保存后的顺序。

Seedance prompt 拼接也必须使用更新后的 scenes。

FFmpeg fallback 拼接也必须使用更新后的 scenes。

---

## 5. P1：单 scene regenerate 稳定

确认接口可用：

```text
POST /api/creative-plans/:id/scenes/:sceneId/regenerate
```

这个接口当前目标是重新生成：

- `visualDescription`
- `subtitle`
- `voiceover`
- `seedancePrompt`
- `transition`

它不负责生成视频片段。

返回后必须写回 plan，并保持 scene id 不变。

---

## 6. P1：scene-level render 技术预留

Day 4 不强制，但可以设计：

```text
POST /api/creative-plans/:id/scenes/:sceneId/render
```

用于后续实现：

- 单分镜视频预览。
- 单分镜视频重生成。
- 最终合成时复用已生成片段。

如果没有实现，请写进文档，不要留半成品接口。

---

## 7. 允许修改范围

允许：

```text
apps/api
packages/shared
prisma/schema.prisma
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
- [ ] 保存 scenes 后 get 能看到新顺序。
- [ ] 修改 duration/transition/subtitle/voiceover/seedancePrompt 后能保存。
- [ ] approve/render 仍可用。
- [ ] render 使用更新后的 scenes。
- [ ] Seedance 成功链路不坏。
- [ ] FFmpeg fallback 不坏。
- [ ] 无 Key 时仍 fallback。

---

## 9. 给后端 Coding Agent 的提示词

```text
你是 Day 4 后端 Agent。
请基于当前 integration 分支新建 feature/day4-scene-edit-api。
Day 4 目标是支持前端分镜剪辑台保存结果，并保证 render 按用户编辑后的 scenes 执行。

请实现或确认：
1. scenes 顺序可以保存；
2. get CreativePlan 返回保存后的顺序；
3. 支持批量保存 scenes，必要时新增 PUT /api/creative-plans/:id/scenes；
4. 校验 duration、transition、seedancePrompt 等字段；
5. render 使用更新后的 scene 顺序；
6. Seedance prompt 和 FFmpeg fallback 都按更新后的 scenes 执行；
7. scene regenerate 接口保持可用，且不改变 scene id。

不要破坏 Day 3 Seedance 真实链路，不要提交密钥。
完成后输出改动文件、build 结果、API 验证结果和未完成的 scene-level render 计划。
```

