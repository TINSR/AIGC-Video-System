# Agent C Day 2 任务书：FFmpeg 出片与视频链路兜底

> 角色：AI/视频 Agent
> 基线分支：`codex/integrate-ai-video`
> 目标：在 Seedance 真实 API 未接入前，保证 fallback 链路可解释、可验证，最好能真实输出 mp4。

---

## 1. 当前 AI/视频状态

已经完成：

- `MockAiProvider` 可生成 `CreativePlanDraft`。
- `ComplianceAgent` 已实现。
- `ContinuityAgent` 已实现。
- `Seedance15OfficialAdapter` 当前 fail-fast。
- `Seedance15Provider` 会在无 key 或 adapter failed 时触发 FFmpeg fallback。
- `FFmpegComposeProvider` 已支持：
  - 图片转视频片段
  - 视频裁剪
  - 字幕文件生成
  - 纯色背景 + 字幕兜底片段
  - 多片段拼接
  - 输出 mp4 到 `outputs`
  - 使用 ffprobe/ffmpeg 获取视频时长
  - 避免依赖 grep，兼容 Windows 思路

当前问题：

- 本机没有可用 FFmpeg，render 最终 `failed`。
- 真实 Seedance API 未接入。
- TTS/BGM 未实现。

---

## 2. P0 任务：验证 FFmpeg 环境

先检查：

```bash
ffmpeg -version
ffprobe -version
```

如果没有安装，请输出安装说明：

```text
Windows 推荐：winget install Gyan.FFmpeg
```

也可以说明手动下载 FFmpeg 并加入 PATH 的步骤。

要求：

- 不要把安装失败写成代码问题。
- 不要要求提交任何本机二进制文件。
- 不要把 FFmpeg 路径硬编码到代码里。

---

## 3. P0 任务：fallback 出片验证

目标：

```text
无 Seedance Key
-> render 自动进入 ffmpeg_fallback
-> outputs 目录出现 mp4
-> GET /api/tasks/:id 返回 success + outputVideoUrl
```

如果仍失败，必须定位并写清楚：

- 是 FFmpeg 未安装？
- 是 ffprobe 不可用？
- 是素材路径不存在？
- 是字幕滤镜失败？
- 是 outputs 目录权限问题？
- 是中文字体/字幕渲染问题？

失败也可以接受，但不能只有 `unknown error`。

---

## 4. P1 任务：素材缺失兜底

如果素材不存在，优先使用：

```text
纯色背景 + 字幕片段
```

这能保证没有真实素材时，也能生成最小可演示 mp4。

建议验证：

- `materials` 为空时能否出片。
- `materials.fileUrl` 不存在时能否出片。
- `scene.subtitle` 有中文时字幕是否正常。
- 总时长是否不超过 15 秒。

---

## 5. P1 任务：Seedance 边界说明

保持当前原则：

- 未接真实 API 前 fail-fast。
- 不伪造 `running`。
- 不提交 API Key。
- 不写死未验证的官方 URL。

可以新增文档：

```text
docs/SEEDANCE_INTEGRATION_NOTES.md
```

说明后续真实接入需要哪些参数，例如：

- API Key 配置方式
- 输入分镜 prompt
- 输入素材 URL
- 输出任务 ID
- 任务状态轮询
- 失败后的 FFmpeg fallback 策略

---

## 6. P2 任务：TTS/BGM 预留

Day 2 不强制做 TTS/BGM。

但要确认：

- 没有 BGM 文件时不失败。
- 没有 TTS 时仍可生成字幕版视频。
- 后续接入点在哪里。

---

## 7. 验收标准

- [ ] `ffmpeg -version` 有结果，或输出安装说明。
- [ ] `ffprobe -version` 有结果，或输出安装说明。
- [ ] 无 Seedance Key 时自动进入 fallback。
- [ ] fallback 成功时得到 mp4。
- [ ] fallback 失败时 `errorMessage` 清楚。
- [ ] outputs 目录可访问。
- [ ] CreativePlan 总时长不超过 15 秒。
- [ ] Seedance adapter 仍保持 fail-fast。

---

## 8. 给 AI/视频 Coding Agent 的提示词

```text
你是 AI/视频 Agent，请基于 codex/integrate-ai-video 分支继续。
当前 MockAiProvider、ComplianceAgent、ContinuityAgent、Seedance fail-fast、FFmpegComposeProvider 都已经存在。
不要重写这些模块。

任务：
1. 验证本机 FFmpeg/ffprobe 是否可用；
2. 让无 Seedance Key 时的 ffmpeg_fallback 尽量真实输出 mp4；
3. 如果素材不存在，使用纯色背景 + 字幕兜底；
4. 保证失败时 errorMessage 清楚；
5. 输出 FFmpeg 安装和验证说明；
6. 不接真实 Seedance，不提交 API Key。

完成后输出改动文件、验证命令、mp4 输出路径或失败原因。
```
