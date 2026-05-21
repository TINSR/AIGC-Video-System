# Agent B Day 1 任务书：后端与数据

> 角色：后端 Agent  
> 负责范围：Express API、数据模型、任务状态、文件上传、接口契约  
> 不负责：前端页面实现、Prompt 内容细化、FFmpeg 具体滤镜效果

---

## 1. 你的目标

你要为项目设计第一版后端骨架。系统核心链路是：

```text
商品信息 -> 素材入库 -> CreativePlan 生成 -> 用户审核确认 -> 创建视频生成任务 -> Redis 队列执行 -> 查询任务进度 -> 返回视频地址
```

Day 1 不要求全部接口可运行，但必须确定模块划分、数据库模型、API 路径和任务状态设计。

---

## 2. 推荐技术栈

- Node.js
- TypeScript
- Express
- Prisma
- MySQL
- Redis
- BullMQ
- Multer，处理文件上传
- Zod，做请求参数校验

第一版使用 MySQL 保存业务数据，Redis + BullMQ 处理 Seedance 1.5 长任务队列和实时进度。不要强依赖对象存储，文件先保存在本地 `uploads/outputs`。

---

## 3. 后端模块划分

推荐目录：

```text
apps/api/src/
  app.ts
  server.ts
  config/
  modules/
    products/
      product.routes.ts
      product.controller.ts
      product.service.ts
    materials/
      material.routes.ts
      material.controller.ts
      material.service.ts
    creative-plans/
      creativePlan.routes.ts
      creativePlan.controller.ts
      creativePlan.service.ts
    render/
      render.routes.ts
      render.controller.ts
      render.service.ts
    analytics/
      analytics.routes.ts
      analytics.service.ts
  providers/
    ai/
      AiProvider.ts
      MockAiProvider.ts
      CreativePlanProvider.ts
    storage/
      LocalStorageProvider.ts
  jobs/
    renderQueue.ts
    renderWorker.ts
  prisma/
    schema.prisma
```

---

## 4. 数据模型草案

请用 Prisma 设计以下模型：

```prisma
model Product {
  id             String     @id @default(cuid())
  title          String
  category       String
  sellingPoints  String
  targetAudience String
  usageScene     String
  createdAt      DateTime   @default(now())
  updatedAt      DateTime   @updatedAt
  materials      Material[]
  creativePlans  CreativePlan[]
  tasks          GenerationTask[]
}

model Material {
  id            String   @id @default(cuid())
  productId     String
  type          String
  fileUrl       String
  thumbnailUrl  String?
  title         String
  tags          String
  aiDescription String?
  duration      Float?
  createdAt     DateTime @default(now())
  product       Product  @relation(fields: [productId], references: [id])
}

model CreativePlan {
  id        String   @id @default(cuid())
  productId String
  status    String
  style     String
  title     String
  hook      String
  adCopy    String   @db.Text
  cta       String
  visualBible Json
  complianceWarnings Json?
  continuityWarnings Json?
  promptTrace Json?
  scenes    Scene[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  product   Product  @relation(fields: [productId], references: [id])
  tasks     GenerationTask[]
}

model Scene {
  id                String @id @default(cuid())
  creativePlanId    String
  order             Int
  duration          Float
  visualDescription String
  subtitle          String
  voiceover         String
  materialId        String?
  seedancePrompt    String @db.Text
  warnings          Json?
  transition        String
  creativePlan      CreativePlan @relation(fields: [creativePlanId], references: [id])
}

model GenerationTask {
  id             String    @id @default(cuid())
  productId      String
  creativePlanId String
  status         String
  progress       Int       @default(0)
  currentStep    String
  provider       String    @default("seedance_1_5")
  outputVideoUrl String?
  errorMessage   String?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  product        Product   @relation(fields: [productId], references: [id])
  creativePlan   CreativePlan @relation(fields: [creativePlanId], references: [id])
  logs           TaskLog[]
}

model TaskLog {
  id        String   @id @default(cuid())
  taskId    String
  level     String
  message   String
  timestamp DateTime @default(now())
  task      GenerationTask @relation(fields: [taskId], references: [id])
}
```

说明：

- `sellingPoints` 和 `tags` 第一版可以用 JSON 字符串保存，降低复杂度。
- 后续可升级为独立表。

---

## 5. API 契约

### 商品

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `POST` | `/api/products` | 创建商品 |
| `GET` | `/api/products` | 商品列表 |
| `GET` | `/api/products/:id` | 商品详情 |
| `PUT` | `/api/products/:id` | 更新商品 |

### 素材

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `POST` | `/api/products/:id/materials` | 上传素材 |
| `GET` | `/api/products/:id/materials` | 素材列表 |
| `PUT` | `/api/materials/:id` | 更新素材标签/描述 |
| `DELETE` | `/api/materials/:id` | 删除素材 |

### 创意方案与分镜

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `POST` | `/api/products/:id/creative-plans/generate` | 生成 CreativePlan |
| `GET` | `/api/products/:id/creative-plans` | 创意方案列表 |
| `GET` | `/api/creative-plans/:id` | 创意方案详情 |
| `PUT` | `/api/creative-plans/:id` | 更新广告词/Hook/CTA/Visual Bible |
| `POST` | `/api/creative-plans/:id/approve` | 用户确认方案 |
| `PUT` | `/api/creative-plans/:id/scenes/:sceneId` | 更新分镜 |
| `POST` | `/api/creative-plans/:id/scenes/:sceneId/regenerate` | 单分镜重生成 |

### 视频生成任务

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `POST` | `/api/creative-plans/:id/render` | 创建生成任务 |
| `GET` | `/api/tasks/:id` | 查询任务 |
| `POST` | `/api/tasks/:id/retry` | 失败重试 |

### 数据看板

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/analytics/overview` | 总览数据 |
| `GET` | `/api/analytics/videos/:videoId` | 单视频数据 |
| `GET` | `/api/analytics/ab-tests` | A/B Mock 对比 |

---

## 6. 任务状态设计

`GenerationTask.status` 可取：

```ts
type TaskStatus = "pending" | "running" | "success" | "failed";
```

推荐步骤：

```text
pending: 任务已创建
running 10%: 读取 CreativePlan 和素材
running 25%: 调用 Seedance 1.5 生成分镜片段
running 40%: 生成字幕和准备配音
running 60%: FFmpeg 后处理
running 80%: 拼接视频与 BGM
running 95%: 导出 mp4
success 100%: 完成
failed: 失败，记录 errorMessage
```

必须保存日志：

- 当前步骤。
- 输入概要。
- 输出路径。
- 错误原因。
- 耗时。

---

## 7. Day 1 交付物

你最终需要输出：

1. 后端目录结构。
2. Prisma 模型草案。
3. API 路径清单。
4. 每个接口的请求/响应 JSON 示例。
5. Redis/BullMQ 队列设计和任务状态流转说明。
6. Day 2 后端开发任务。

---

## 8. 验收标准

你的输出必须能回答：

- 前端创建商品时调用哪个接口？
- 文件上传后保存在哪里？
- AI 生成的 CreativePlan 和分镜保存到哪些表？
- 用户确认方案后如何创建任务并推入 Redis 队列？
- 前端如何查询任务进度？
- 生成失败时如何展示错误和重试？

---

## 9. 禁止事项

- 不要把业务逻辑全部写在一个 `server.ts`。
- 不要第一版强依赖云对象存储。
- 不要把模型返回的 JSON 不校验就直接入库。
- 不要把 API Key 写进代码。
