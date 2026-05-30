# Day 6 环境边界说明（后端）

> 分支：`feature/day6-backend-env-smoke`  
> 结论日期：2026-05-30

## MySQL

- **本地演示：必选**（商品、素材、CreativePlan、Scene 持久化依赖 Prisma + MySQL）。
- `DATABASE_URL` 未配置或 MySQL 未启动时：商品/CreativePlan 的 DB 写入会 fallback 到内存（见 `CreativePlanService`），但 `POST /api/products` 仍需要 MySQL。
- 首次环境请执行：

```bash
npm.cmd --prefix apps/api run db:generate
npm.cmd --prefix apps/api run db:migrate
```

## Redis

- **本地演示：可选（方案 B）**。
- 主链路 render 使用 `RenderService` **进程内异步执行**，不依赖 BullMQ 队列。
- `apps/api/src/jobs/renderWorker.ts` 仅在 Redis ≥ 5.0 且连接成功时启动；未启动 Redis 时 API 仍可运行，render 仍可用。
- Redis 未启动时：可能出现一次连接告警，不会导致 API 整体崩溃。

## 任务状态来源

| 场景 | 来源 |
|------|------|
| render 进行中 | 内存 `taskStore`（主） |
| MySQL 可用 | 同步写入 `GenerationTask` + `TaskLog`（备） |
| `GET /api/tasks/:id` | 优先读 MySQL，失败则读内存 |

## Seedance 视频 URL

- 有远端 `videoUrl` 时：尝试下载到 `outputs/<taskId>.mp4`，成功则 `outputVideoUrl=/outputs/<taskId>.mp4`。
- 下载失败：保留远端 URL，任务仍为 `success`，logs 记录落盘失败原因。
