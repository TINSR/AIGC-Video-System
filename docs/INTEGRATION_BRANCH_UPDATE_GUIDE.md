# 如何同步 integration 分支代码

> 目标：把 `codex/integrate-ai-video` 上的集成代码同步到自己的开发分支。  
> 适用场景：队友已经有自己的功能分支，需要拿到最新后端、前端、AI/video 集成代码。

---

## 当前推荐分支

集成分支：

```bash
codex/integrate-ai-video
```

这个分支基于最新 `main`，并已经合入 AI CreativePlan / render mock 链路。

包含：

- `main` 上已有的前端、产品 API、Prisma、Redis/BullMQ 基础设施。
- `feature/ai-creative-plan` 上的 MockAiProvider、ComplianceAgent、ContinuityAgent、Seedance/FFmpeg fallback。
- 已接入的 creative-plan / render 路由。

---

## 同步前先确认自己有没有未提交改动

在自己的仓库里运行：

```bash
git status
```

如果显示：

```text
working tree clean
```

说明工作区干净，可以继续。

如果有 modified / untracked 文件，先提交或 stash。

临时保存本地改动：

```bash
git stash push -m "save local work before syncing integration"
```

---

## 方式一：直接切到 integration 分支查看

如果只是想运行或查看最新集成代码：

```bash
git fetch origin
git checkout codex/integrate-ai-video
git pull
```

然后安装依赖：

```bash
npm install
```

生成 Prisma Client：

```bash
npm --prefix apps/api run db:generate
```

验证构建：

```bash
npm --prefix apps/api run build
npm --prefix apps/web run build
```

---

## 方式二：把 integration 合入自己的功能分支

假设你的分支叫：

```bash
feature/your-branch
```

运行：

```bash
git fetch origin
git checkout feature/your-branch
git merge origin/codex/integrate-ai-video
```

如果没有冲突，继续验证：

```bash
npm install
npm --prefix apps/api run db:generate
npm --prefix apps/api run build
npm --prefix apps/web run build
```

如果有冲突，先不要强行提交。解决冲突后运行：

```bash
git status
git add <resolved-files>
git commit
```

---

## 方式三：从 integration 新开分支继续开发

如果你的旧分支不重要，或者想从干净状态继续开发：

```bash
git fetch origin
git checkout -b feature/your-new-task origin/codex/integrate-ai-video
```

之后在这个新分支上继续写代码。

---

## 本地运行 API

默认 API 端口是 `3001`。

如果本机 `3001` 被占用，可以换端口：

Windows PowerShell：

```powershell
$env:PORT = "3101"
npm --prefix apps/api run dev
```

Windows cmd：

```cmd
set PORT=3101&& npm --prefix apps/api run dev
```

健康检查：

```bash
curl http://localhost:3101/api/health
```

---

## 本地运行前端

```bash
npm --prefix apps/web run dev
```

如果要让前端调用真实后端，需要设置：

```text
VITE_USE_MOCK=false
VITE_API_BASE_URL=http://localhost:3101/api
```

---

## 可验证的接口链路

生成 CreativePlan：

```bash
POST /api/products/product_001/creative-plans/generate
```

查询 CreativePlan 列表：

```bash
GET /api/products/product_001/creative-plans
```

批准 CreativePlan：

```bash
POST /api/creative-plans/:id/approve
```

创建渲染任务：

```bash
POST /api/creative-plans/:id/render
```

查询任务：

```bash
GET /api/tasks/:id
```

---

## 已知注意事项

- 目前 CreativePlan / render 链路仍是 Day 1 mock 实现，使用内存 Map 存储，重启服务后数据会丢失。
- Seedance 官方 API 还没有真实接入，当前会 fail-fast 并进入 FFmpeg fallback。
- 如果本机没有安装 `ffmpeg`，渲染任务可能会创建成功，但最终合成 mp4 失败。
- Prisma schema 已在 `main` 中存在，但 creative-plan/render 当前还没有完全切到数据库存储。
- 不要直接把个人功能分支合进 `main`。推荐流程是：个人分支 -> `dev` -> 验收后 -> `main`。

---

## 推荐沟通方式

同步前可以在群里说：

```text
我准备把 origin/codex/integrate-ai-video 合到我的功能分支，先同步集成代码。如果有冲突，我会先发出来确认再处理。
```

同步后可以说：

```text
我已经同步 integration 分支，并跑过 api/web build。接下来基于这个分支继续开发。
```
