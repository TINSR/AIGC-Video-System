# Agent B Day 2 任务书：后端接口开发与联调

> 角色：后端 Agent  
> 负责范围：完成所有核心业务接口、文件上传、队列联调、接口测试
> 完成时限：Day2 结束前所有接口可被前端调用

---

## 1. 你的目标
完成所有核心业务模块的接口开发，确保前端可以调用所有核心链路接口，实现最小可用流程：
```text
创建商品 -> 上传素材 -> 生成创意方案 -> 审核确认 -> 创建视频任务 -> 查询进度 -> 返回视频地址
```

---

## 2. Day2 开发优先级
### P0 最高优先级（必须完成，支撑前端核心流程）
1. 素材模块4个接口
2. 创意方案核心接口（生成、查询、审核）
3. 视频渲染任务接口（创建、查询、重试）
4. 本地文件上传服务

### P1 次高优先级（当天完成）
1. 创意方案编辑接口（更新方案、更新分镜、分镜重生成）
2. 数据看板基础接口
3. 所有接口参数校验和错误处理
4. 接口文档编写

---

## 3. 详细开发任务清单
### 3.1 素材模块（P0）
实现4个接口，支持图片/视频素材上传、管理：
| 方法 | 路径 | 功能说明 | 技术要点 |
| --- | --- | --- | --- |
| `POST` | `/api/products/:id/materials` | 上传素材 | 使用Multer实现文件上传，支持图片(jpg/png/webp)和视频(mp4/mov)，自动生成缩略图，文件保存到uploads目录 |
| `GET` | `/api/products/:id/materials` | 素材列表 | 分页返回指定商品下的所有素材，支持按类型筛选 |
| `PUT` | `/api/materials/:id` | 更新素材 | 支持修改素材标题、标签、AI描述 |
| `DELETE` | `/api/materials/:id` | 删除素材 | 同时删除本地文件和数据库记录 |

字段要求完全遵循`SHARED_CONTRACT_DAY1.md`中的`Material`类型定义。

---

### 3.2 创意方案模块（P0 + P1）
实现创意方案全生命周期接口：
| 优先级 | 方法 | 路径 | 功能说明 |
| --- | --- | --- | --- |
| P0 | `POST` | `/api/products/:id/creative-plans/generate` | 生成创意方案 | 接收风格、时长等参数，先对接MockAiProvider返回固定格式的CreativePlan数据 |
| P0 | `GET` | `/api/products/:id/creative-plans` | 创意方案列表 | 返回指定商品下的所有创意方案 |
| P0 | `GET` | `/api/creative-plans/:id` | 创意方案详情 | 包含所有分镜信息 |
| P0 | `POST` | `/api/creative-plans/:id/approve` | 确认方案 | 修改方案状态为approved，可直接触发渲染任务 |
| P1 | `PUT` | `/api/creative-plans/:id` | 更新方案 | 支持修改广告词、Hook、CTA、Visual Bible |
| P1 | `PUT` | `/api/creative-plans/:id/scenes/:sceneId` | 更新分镜 | 支持修改分镜的时长、字幕、配音、SeedancePrompt等 |
| P1 | `POST` | `/api/creative-plans/:id/scenes/:sceneId/regenerate` | 重生成单分镜 | 调用MockAI重新生成分镜内容 |

所有字段完全遵循`CreativePlan`和`Scene`类型定义。

---

### 3.3 视频渲染任务模块（P0）
实现视频生成任务全流程接口：
| 方法 | 路径 | 功能说明 | 技术要点 |
| --- | --- | --- | --- |
| `POST` | `/api/creative-plans/:id/render` | 创建生成任务 | 接收渲染参数，创建GenerationTask记录，推入BullMQ队列，返回任务ID |
| `GET` | `/api/tasks/:id` | 查询任务详情 | 实时返回任务状态、进度、当前步骤、日志列表、输出视频地址 |
| `POST` | `/api/tasks/:id/retry` | 失败重试 | 重新将失败任务推入队列执行 |

任务状态流转和进度完全遵循文档约定的8个阶段（0%~100%）。

---

### 3.4 基础服务完善（P0）
1. 实现`LocalStorageProvider`：封装文件上传、删除、访问路径生成逻辑
2. 实现`MockAiProvider`：模拟AI生成CreativePlan和分镜，返回符合格式的测试数据
3. 完善参数校验：所有接口使用Zod做参数校验，统一错误返回格式
4. 实现CORS配置，支持前端跨域调用

---

### 3.5 数据看板模块（P1）
| 方法 | 路径 | 功能说明 |
| --- | --- | --- |
| `GET` | `/api/analytics/overview` | 总览数据 | 返回商品总数、素材总数、生成视频总数、成功/失败任务数 |
| `GET` | `/api/analytics/videos/:videoId` | 单视频数据 | 返回视频生成耗时、参数等信息 |

---

## 4. Day2 交付物
1. 所有核心接口代码实现，可直接运行调用
2. 接口测试用例（Postman集合或curl示例）
3. 接口文档（包含每个接口的请求参数、响应示例、错误码说明）
4. MockAI服务实现，可生成符合格式的创意方案数据
5. 本地文件上传服务完整实现

---

## 5. 验收标准
所有接口必须通过以下验证：
1. ✅ 前端可以调用`POST /api/products/:id/materials`成功上传图片和视频
2. ✅ 前端可以调用`POST /api/products/:id/creative-plans/generate`拿到符合格式的CreativePlan数据
3. ✅ 前端可以调用`POST /api/creative-plans/:id/approve`确认方案并创建渲染任务
4. ✅ 前端可以调用`GET /api/tasks/:id`实时查询任务进度，直到返回成功的视频地址
5. ✅ 生成的视频文件可以通过返回的`outputVideoUrl`直接访问播放
6. ✅ 所有错误情况返回符合格式的错误信息，参数校验友好提示

---

## 6. 注意事项
1. 所有接口严格遵循`SHARED_CONTRACT_DAY1.md`的类型定义，字段名、类型必须和前端完全对齐
2. 上传的文件命名使用`cuid() + 扩展名`，避免重名
3. 任务日志必须记录完整，便于排查问题
4. 不要硬编码任何路径或配置，全部从环境变量读取
5. 先完成Mock实现，不依赖真实AI和视频生成服务，确保接口先跑通
