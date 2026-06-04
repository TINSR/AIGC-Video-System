# Smart Clip Editing 共享验收清单

## 1. 构建

```bash
npm.cmd --prefix apps/api run db:generate
npm.cmd --prefix apps/api run build
npm.cmd --prefix apps/web run build
git diff --check
```

## 2. 数据结构

- [ ] MaterialClip 类型。
- [ ] SceneClipMatch 类型。
- [ ] SmartEditPlan 类型。
- [ ] RenderMode 包含 `smart_clip_edit`。
- [ ] GenerationTask.provider 包含 `smart_clip_edit`。
- [ ] Prisma migration。

## 3. 素材分析

- [ ] 图片素材包装为 image clip。
- [ ] 视频素材切成 video_clip。
- [ ] clip 有 summary。
- [ ] clip 有 tags。
- [ ] clip 有 sceneType。
- [ ] clip 有 visualQuality。
- [ ] clip 有 suitableGoals。
- [ ] 重复 analyze 不产生无穷重复脏数据。
- [ ] 视频素材最多生成有限数量 clips。

## 4. 分镜匹配

- [ ] 每个 scene 都有 decision。
- [ ] decision 有 score。
- [ ] decision 有 reasons。
- [ ] 匹配优先考虑 scene.goal。
- [ ] 匹配考虑关键词。
- [ ] 素材不足时 fallback 商品图。
- [ ] 前端能展示匹配结果。
- [ ] 连续分镜尽量不重复同一 clip。
- [ ] reasons 是中文可读句子。

## 5. 智能剪辑渲染

- [ ] `POST /creative-plans/:id/render` 支持 `renderMode=smart_clip_edit`。
- [ ] 不调用 Seedance。
- [ ] 使用 FFmpeg 合成。
- [ ] 字幕烧录。
- [ ] 输出 mp4。
- [ ] `/outputs/*.mp4` HTTP 200。
- [ ] Task status success。
- [ ] Task logs 清楚展示智能剪辑步骤。
- [ ] 不破坏原 full_video render。
- [ ] 不破坏 scene preview render。

## 6. 前端

- [ ] Review 页有“素材智能剪辑”区块。
- [ ] 可点击“分析素材”。
- [ ] 可点击“重新匹配”。
- [ ] 可点击“素材智能剪辑成片”。
- [ ] 每个分镜显示 clip、score、reasons。
- [ ] 失败不白屏。

## 7. 可选增强

- [ ] Xiaomi MiMo TTS。
- [ ] BGM。
- [ ] TTS 失败不阻塞。
- [ ] BGM 缺失不阻塞。

## 8. 回归

- [ ] Seedance full_video 仍可用。
- [ ] scene preview 仍可用。
- [ ] 普通 FFmpeg fallback 仍可用。
- [ ] 数据看板仍可用。
- [ ] 参考视频库仍可用。

## 9. 最终演示

演示路径：

```text
上传商品图 + 商品视频
-> 生成 CreativePlan
-> 打开审核页
-> 分析素材 clips
-> 展示 scene -> clip 匹配原因
-> 点击素材智能剪辑成片
-> 打开任务页
-> 打开输出视频
```

最终答辩必须能说清：

```text
Seedance 整片生成适合创意视频。
Smart Clip Editing 适合商家真实素材可控剪辑。
两条链路共用 CreativePlan 和分镜，但视频来源和合成方式不同。
```
