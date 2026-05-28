# GitHub 协作与每日交付规则

> 项目：电商场景 AIGC 带货视频生成系统  
> 适用对象：前端、后端、AI/视频模块三位队友  
> 目标：保证每天都有可检查交付，并且第 7 天前跑通完整链路

---

## 1. 我们怎么管理项目

本项目只用三类工具管理：

```text
GitHub 仓库：管理代码和文档
GitHub Issues：管理任务
Pull Request：合并代码和验收交付
```

不要只在群里口头说“我做完了”。每个任务都必须有：

- GitHub Issue。
- 代码提交。
- Pull Request。
- 截图、录屏或接口测试结果。
- 明确的验收标准。

---

## 2. 分支规则

分支分为三层：

```text
main：稳定演示版，只放确定能跑通的代码
dev：日常集成分支，大家的功能先合到这里
feature/xxx：个人功能分支
```

推荐分支：

```text
feature/frontend-pages
feature/backend-api
feature/ai-creative-plan
feature/ai-video
feature/docs
```

规则：

- 不要直接往 `main` 提交。
- 不要直接往 `dev` 提交，尽量通过 PR 合并。
- 每天晚上把可运行的功能合到 `dev`。
- `dev` 跑通完整链路后，才能合到 `main`。
- 第 7 天之后，`main` 必须一直保持可演示。

---

## 3. 每个人怎么提交代码

### 第一次拉项目

```bash
git clone <仓库地址>
cd <项目目录>
git checkout -b feature/frontend-pages
```

不同角色换成自己的分支名：

```bash
git checkout -b feature/backend-api
git checkout -b feature/ai-creative-plan
```

### 每天开发前同步 dev

```bash
git checkout dev
git pull origin dev
git checkout feature/你的分支名
git merge dev
```

如果有冲突，先解决冲突，再继续开发。

### 开发完成后提交

```bash
git status
git add .
git commit -m "feat: add creative plan review page"
git push origin feature/你的分支名
```

提交信息建议：

```text
feat: 新功能
fix: 修复问题
docs: 文档修改
refactor: 重构
chore: 配置或杂项
```

例子：

```bash
git commit -m "feat: add product create api"
git commit -m "feat: add mock creative plan provider"
git commit -m "fix: correct task progress response"
git commit -m "docs: update local setup guide"
```

---

## 4. Pull Request 怎么写

PR 合并目标：

```text
base: dev
compare: feature/你的分支名
```

PR 描述必须包含：

```md
## 做了什么

- 

## 如何验收

- 

## 截图/录屏/接口结果

- 

## 是否影响其他模块

- 

## 关联 Issue

Closes #issue编号
```

没有验收方式的 PR 不合并。

---

## 5. Issue 怎么写

每个任务都建一个 Issue。

标题格式：

```text
[Frontend] 创意方案审核页
[Backend] CreativePlan API
[AI] Mock CreativePlan Provider
[Video] FFmpeg fallback render
[Docs] README 启动说明
```

Issue 内容模板：

```md
## 目标

说明这个任务要完成什么。

## 输入

需要哪些数据、接口或前置模块。

## 输出

完成后会产出什么页面、接口、文件或能力。

## 验收标准

- [ ] 
- [ ] 
- [ ] 

## 负责人

@某某

## 截止时间

Day X

## 依赖

依赖哪些任务或接口。
```

---

## 6. 三个角色的交付标准

### 前端交付标准

前端每天至少交付一个可查看结果：

- 页面。
- 路由。
- 组件。
- Mock 数据展示。
- 接口联调结果。

前端最低验收：

```text
能创建商品页
能展示素材页
能展示 CreativePlan 审核页
能展示分镜卡片
能编辑字幕、时长、Seedance Prompt
能展示任务进度
能播放视频
```

### 后端交付标准

后端每天至少交付一个可测试接口或基础设施：

- API。
- Prisma schema。
- MySQL migration。
- Redis/BullMQ 队列。
- 文件上传。
- 任务状态更新。

后端最低验收：

```text
POST /api/products 可创建商品
GET /api/products 可查询商品
POST /api/products/:id/materials 可上传素材
POST /api/products/:id/creative-plans/generate 可返回 CreativePlan
POST /api/creative-plans/:id/approve 可确认方案
POST /api/creative-plans/:id/render 可创建任务
GET /api/tasks/:id 可查询进度
```

### AI/视频模块交付标准

AI/视频模块每天至少交付一个可运行或可复用产物：

- Prompt 模板。
- CreativePlan JSON 样例。
- MockAiProvider。
- 合规检查函数。
- 连贯性检查函数。
- Seedance 1.5 输入结构。
- FFmpeg 兜底生成脚本。

AI/视频最低验收：

```text
输入商品信息和素材
能生成 CreativePlan
CreativePlan 包含广告词、Hook、CTA、Visual Bible、3-5 个分镜
每个分镜包含 subtitle、voiceover、seedancePrompt
能输出合规检查和连贯性检查
没有真实模型时能走 Mock
Seedance 不可用时能用 FFmpeg 兜底生成 mp4
```

---

## 7. 每日全链路验收

每天晚上必须跑一次“黄金链路”。

黄金链路：

```text
1. 启动 MySQL
2. 启动 Redis
3. 启动后端
4. 启动前端
5. 创建商品
6. 上传素材
7. 生成 CreativePlan
8. 查看广告词、Visual Bible、分镜、Seedance Prompt
9. 修改一个分镜字幕
10. 点击确认生成视频
11. 任务进度从 0 到 100
12. 生成 final.mp4
13. 前端能播放和下载视频
```

如果任意一步失败，当天就不能算完整交付。

---

## 8. 每日验收清单

建议每天在群里按这个格式汇报：

```md
## 今日交付

负责人：
日期：

### GitHub

- Issue：
- PR：
- Commit：

### 完成内容

- 

### 验收方式

- 

### 截图/录屏/接口结果

- 

### 是否影响别人

- 

### 明天计划

- 

### 当前阻塞

- 
```

---

## 9. 本地启动标准

项目最终 README 里必须支持类似命令：

```bash
npm install
docker compose up -d mysql redis
npm run db:migrate
npm run db:seed
npm run dev:api
npm run dev:web
```

如果某个人换电脑后按 README 不能启动，就说明交付不完整。

---

## 10. 合并 PR 前检查

每个 PR 合并前至少检查：

- [ ] 本地能启动。
- [ ] 不破坏 `dev` 分支已有功能。
- [ ] 如果改了 API，已同步共享契约或接口文档。
- [ ] 如果改了类型，前后端字段名一致。
- [ ] 如果新增环境变量，已更新 `.env.example`。
- [ ] 有截图、录屏或接口测试结果。
- [ ] 没有提交 `.env`、API Key、大视频文件、`node_modules`。

---

## 11. 第 7 天强制里程碑

第 7 天必须跑通：

```text
商品 -> 素材 -> CreativePlan -> 用户审核 -> 生成任务 -> mp4 -> 前端预览
```

哪怕视频很粗糙，也必须跑通。

第 7 天之后：

- 不再大改架构。
- 不再随便加大功能。
- 优先修 bug、打磨 UI、录演示视频、补 README。
- `main` 分支必须保持可演示。

---

## 12. 最终比赛交付清单

最终至少交付：

- GitHub 仓库链接。
- README。
- 在线 Demo 或本地启动说明。
- 演示视频，建议 3-8 分钟。
- 1-2 条生成出来的带货视频。
- 架构图。
- 团队成员与分工。
- AI 能力说明。
- Seedance 1.5 使用说明。
- FFmpeg 兜底说明。

最低可交付版本：

```text
能创建商品
能上传素材
能生成 CreativePlan
能审核和修改分镜
能确认生成视频
能看到任务进度
能输出并播放 mp4
有 README
有演示视频
```

---

## 13. 最重要的原则

每天可以功能少，但必须越来越能跑。

```text
dev 分支每天集成
main 分支保持稳定
第 7 天跑通全链路
第 10 天后停止大改
最后几天只打磨、修 bug、录演示
```

