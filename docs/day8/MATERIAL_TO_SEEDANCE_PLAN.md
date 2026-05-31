# Day 8 素材传入 Seedance 技术方案

> Agent C 输出，Day 8 P1 交付物。

---

## 1. 图片素材

### 方案对比

| 方案 | 描述 | 优点 | 缺点 |
|------|------|------|------|
| A: base64 | 将图片编码为 base64，放入 Seedance 请求体 | 无需外部存储，实现简单 | 请求体大，编码耗时 |
| B: 公网 URL | 上传到对象存储（S3/OSS），传 URL 给 Seedance | 请求体小，Seedance 原生支持 | 需要对象存储基础设施 |
| C: 素材描述 | 只传 aiDescription + tags 到 prompt，不传真实图片 | 零依赖，最稳定 | 无法利用图片内容 |

### Day 8 结论

```text
短期：方案 C（素材描述注入 prompt）— 已实现
中期：方案 A（base64）— 适合本地开发验证
正式：方案 B（公网 URL）— 生产推荐
```

### 当前实现

Day 8 已实现素材描述注入：

```text
每个 scene 的 seedancePrompt 包含：
- materialUsage 标识（source_clip / reference_image / prompt_only）
- [素材：使用提供的视频素材作为参考] 或 [素材：使用提供的图片作为商品外观参考]
```

---

## 2. 视频素材

### 方案对比

| 方案 | 描述 | 优点 | 缺点 |
|------|------|------|------|
| A: 抽关键帧 | 从视频抽取关键帧作为图片 reference | 复用图片方案 | 需要 FFmpeg 抽帧 |
| B: 公网 URL | 上传视频到对象存储，传 URL | Seedance 可直接使用 | 需要存储 + 带宽 |
| C: 视频描述 | 只提取描述、时长、tags 用于 prompt | 零依赖 | 无法利用视频内容 |

### Day 8 结论

```text
短期：方案 C（视频描述注入 prompt）— 已实现
中期：方案 A（抽关键帧）— 可用 FFmpeg 实现
正式：方案 B（公网 URL）— 生产推荐
```

### 关键约束

```text
本地 /uploads/xxx 路径不能直接传给 Seedance
Seedance 运行在远端服务器，无法访问本地文件系统
所有传给 Seedance 的素材必须是 base64 或公网可访问 URL
```

---

## 3. 推荐实施路径

```text
Day 8:  素材描述注入 prompt（已完成）
Day 9:  图片 base64 传入验证
Day 10: 视频关键帧抽取 + 图片 reference
Day 11+: 对象存储接入，公网 URL 方案
```

---

## 4. 代码改动点

当前改动位置：

```text
CreativePlanPipeline.ts
  -> seedancePromptAgent(): 注入 materialUsage 信息到 prompt
  -> storyboardAgent(): 分配 materialUsage 类型

Seedance15OfficialAdapter.ts
  -> buildPrompt(): 使用 visualBible 和 scene 信息构建整片 prompt
```

后续 base64 方案需要改动：

```text
Seedance15OfficialAdapter.ts
  -> buildCreateTaskBody(): 在 content 数组中添加 image 类型的 base64 数据

RenderService.ts
  -> startRender(): 读取素材文件并编码为 base64
```
