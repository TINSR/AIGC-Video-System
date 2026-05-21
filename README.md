# AIGC Video System

电商场景 AIGC 带货视频生成系统。

当前仓库先提交项目方案、架构文档和 Day 1 协作任务书。后续实现采用：

- React + TypeScript 前端
- Node.js + TypeScript + Express 后端
- MySQL + Prisma 业务数据
- Redis + BullMQ 任务队列
- Seedance 1.5 视频生成
- FFmpeg 后处理与兜底

核心流程：

```text
商品与素材 -> CreativePlan -> 用户审核 -> Seedance 1.5 生成 -> FFmpeg 后处理 -> 视频预览导出
```

详细方案见：

- `TWO_WEEK_MVP_IMPLEMENTATION.md`
- `docs/ARCHITECTURE_DIAGRAM.md`
- `docs/GITHUB_COLLABORATION_AND_DELIVERY.md`
- `docs/day1/`
