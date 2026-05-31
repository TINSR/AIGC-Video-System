# Day 4 共享验收清单

> Day 4 目标：轻量分镜剪辑台可用，Seedance / FFmpeg 双链路不坏。

---

## 1. 构建验收

必须通过：

```bash
npm --prefix apps/api run build
npm --prefix apps/web run build
```

如修改 Prisma：

```bash
npm --prefix apps/api run db:generate
```

---

## 2. 前端验收

必须确认：

- [ ] 有明确的 Scene Timeline / 分镜剪辑台。
- [ ] 每个 scene 展示 duration、transition、subtitle、voiceover、visualDescription、seedancePrompt。
- [ ] 可以编辑 duration。
- [ ] 可以编辑 transition。
- [ ] 可以编辑 subtitle。
- [ ] 可以编辑 voiceover。
- [ ] 可以编辑 seedancePrompt。
- [ ] 可以调整 scene 顺序。
- [ ] 可以保存剪辑。
- [ ] 保存后刷新不丢。
- [ ] approve/render 仍可用。

---

## 3. 后端验收

必须确认：

- [ ] get CreativePlan 返回保存后的 scenes 顺序。
- [ ] scene 字段修改能保存。
- [ ] duration 校验为 1-15 秒。
- [ ] render 使用更新后的 scenes。
- [ ] Seedance prompt 使用更新后的 scenes。
- [ ] FFmpeg fallback 使用更新后的 scenes。
- [ ] scene regenerate 文案/prompt 接口可用，或明确说明未完成。

---

## 4. AI/视频验收

必须确认：

- [ ] 无 `SEEDANCE_API_KEY` 时 fallback 可用。
- [ ] 有 Key 时 Seedance 仍能提交任务。
- [ ] Seedance 成功时返回真实远端 `videoUrl`。
- [ ] Seedance 无 `videoUrl` 时自动 fallback。
- [ ] task logs 不泄露 API Key。
- [ ] prompt 更适合电商带货短视频。
- [ ] 素材传递方案已记录。
- [ ] 分镜级视频预览方案已记录。

---

## 5. 产品级联调验收

完整流程：

```text
打开前端
-> 生成 CreativePlan
-> 进入分镜剪辑台
-> 调整第 2 个 scene 到第 1 个
-> 修改一个 scene 的 duration/subtitle/transition/prompt
-> 保存
-> 刷新并确认顺序和内容不丢
-> approve
-> render
-> 查看 task
-> 查看最终视频
```

通过标准：

- 页面不白屏。
- API 不报 500。
- task 成功或失败都可解释。
- 有 Key 时优先 Seedance。
- 无 Key 时 fallback。
- 最终视频链接可访问。

---

## 6. 是否可以合并

可以合并到 integration 的条件：

- build 通过。
- 分镜剪辑台 P0 完成。
- 保存 scenes 后 render 使用新顺序。
- Seedance / FFmpeg 双链路不坏。
- 没有提交密钥。
- 没有修改共享 API 路径导致旧页面不可用。

不能合并的 P0：

- 保存后 scenes 丢失。
- render 不按保存后的 scenes 执行。
- 无 Key fallback 被破坏。
- 有 Key Seedance 原有成功链路被破坏。
- 前端剪辑台白屏。
- API Key 出现在代码、文档、日志或提交记录中。

