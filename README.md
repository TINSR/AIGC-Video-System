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

## 最终成果与评审材料

最终比赛版本已实现商品素材上传、多 Agent CreativePlan、双阶段审核、
Seedance 1.5 生成、真实素材智能剪辑、MiMo TTS、任务追踪和数据看板。

- [最终成果材料索引](docs/submission/README.md)
- [项目完整说明](docs/submission/technical/PROJECT_OVERVIEW.md)
- [运行与部署说明](docs/submission/technical/RUN_AND_DEPLOY.md)
- [API 清单](docs/submission/technical/API_REFERENCE.md)
- [技术难点与解决方案](docs/submission/technical/ENGINEERING_CHALLENGES.md)
- [系统总架构图](docs/submission/diagrams/system-architecture.png)
- [产品截图](docs/submission/screenshots/)

> 安全说明：仓库仅包含环境变量名称和空占位符，不包含真实 API Key。
