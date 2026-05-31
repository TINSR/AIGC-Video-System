# Day 10 Agent C 演示话术

---

## 素材链路

用户上传图片后，系统尝试上传到 OSS/TOS 获取公网 URL（material.publicUrl）。生成视频时，优先使用 publicUrl 作为 Seedance 1.5 的 first_frame 输入。无 publicUrl 时降级为本地 base64，再降级为纯 prompt。

视频素材 Day 10 暂通过描述注入 prompt，后续支持 FFmpeg 抽关键帧转图片 reference。

---

## Seedance 1.5 输入规范

当前使用 Seedance 1.5 Pro，只支持单张 first_frame 图片。不传多张参考图，不声称支持 Seedance 2.0 能力。

---

## Fallback 模式

通过 ALLOW_FFMPEG_FALLBACK 环境变量控制：

演示模式（默认）：Seedance 失败/超时时自动降级到 FFmpeg 兜底，保证演示稳定。

生产严格模式：设置 ALLOW_FFMPEG_FALLBACK=false 后，Seedance 失败直接报错，不做演示兜底。

---

## 仍需改进

1. 视频素材抽关键帧转图片 reference
2. OSS/TOS 上传自动集成
3. Seedance 2.0 多参考图能力评估
