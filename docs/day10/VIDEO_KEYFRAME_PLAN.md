# Day 10 视频素材抽帧规划

> Agent C 输出，Day 10 P1 交付物。

---

## 1. 目标

将视频素材的关键帧提取为图片，作为 Seedance 1.5 的 first_frame 输入。

---

## 2. 流程

```text
用户上传视频
-> FFmpeg 抽取关键帧（第 1 秒 / 中间帧 / 最具代表性帧）
-> 选择 1 张代表帧
-> 上传到 OSS/TOS
-> 保存为 material.publicUrl
-> 作为 Seedance 1.5 first_frame
```

---

## 3. 技术方案

### 抽帧命令

```bash
ffmpeg -i input.mp4 -ss 00:00:01 -vframes 1 -q:v 2 output.jpg
```

### 帧选择策略

```text
方案 A：固定取第 1 秒帧（简单，适合短视频）
方案 B：取中间帧（适合展示类视频）
方案 C：场景检测取最具代表性帧（复杂，效果最好）

Day 10 推荐：方案 A，短视频广告第 1 秒通常是核心画面
```

### 存储路径

```text
抽帧图片：/uploads/frames/{materialId}_frame.jpg
上传后：material.publicUrl = OSS/TOS URL
```

---

## 4. 实施计划

```text
Day 10: 方案设计（本文档）
Day 11: FFmpeg 抽帧最小实现
Day 12: 抽帧 + OSS 上传集成
Day 13: 前端展示视频素材关键帧预览
```

---

## 5. 约束

```text
抽帧失败不影响视频素材上传
抽帧是异步操作，不阻塞主流程
抽帧图片不写入数据库，只用于生成 publicUrl
本地开发可跳过 OSS，直接用 base64 fallback
```
