# Day 11 三方集成审查与修复报告

## 1. 审查范围

共同基线：

```text
origin/codex/integrate-ai-video
```

纳入集成审查的分支：

```text
feature/day11-backend-aliyun-oss-provider
feature/day11-frontend-primary-image-review
本地 Agent C 素材角色分析与 Seedance first_frame 改动
```

审查重点：

```text
素材角色分析
用户确认商品主图
阿里云 OSS publicUrl
Seedance 1.5 first_frame
Prisma migration
真实素材 render 链路
API Key 与 OSS Secret 泄露风险
```

## 2. 审查发现

集成前，各分支可以独立构建，但存在以下阻断问题：

### P0-1：前端主图确认仅写入 localStorage

前端点击“设为商品主图”后没有调用后端 API。页面看似更新，但数据库和 Seedance 渲染链路不知道用户选择。

### P0-2：RenderController 仍固定使用 demoMaterials

即使数据库已保存真实上传素材，整片渲染仍会向 RenderService 传入榨汁杯 demo 素材，导致用户主图无法进入 Seedance。

### P0-3：Prisma migration 重复新增字段

Agent C 和后端分支都新增了 `role`、`isPrimary`。直接合并部署会出现：

```text
P3018
Duplicate column name 'role'
```

### P0-4：Agent C 的真实素材分类链路未进入远端集成版

Doubao 多模态分类器、`analyze-roles` API 和更完整的 first_frame 选择规则只存在于本地改动中。

## 3. 已完成修复

### 3.1 主图确认持久化

新增并接通：

```text
PUT /api/products/:productId/materials/:materialId/primary
```

前端按钮会调用真实 API。后端校验素材属于当前商品且类型为图片，取消旧主图并保存新主图。

### 3.2 真实素材进入 RenderService

RenderController 根据 `creativePlan.productId` 查询真实素材，并校验前端传入的 `primaryMaterialId`。仅 Day 1 演示商品在没有真实素材时保留 demo fallback。

### 3.3 Doubao 素材角色分析

新增：

```text
GET /api/products/:productId/materials/analyze-roles
```

支持：

```text
真实多模态 LLM 分类
LLM 不可用时规则 fallback
拒绝 LLM 编造 materialId
非法 role 降级为 other
持久化 role、roleConfidence、roleReason
```

### 3.4 Seedance first_frame 优先级

当前选择顺序：

```text
用户确认 isPrimary=true
-> AI 推荐 product_primary
-> 第一张有效 OSS publicUrl
-> Base64 调试 fallback
-> 纯 prompt
```

Base64 仅在显式设置 `SEEDANCE_ALLOW_BASE64_DEBUG=true` 时启用。

### 3.5 Migration 收敛

保留第一条 migration：

```text
20260601000000_add_material_role_primary
```

第二条 migration 调整为仅补充：

```text
roleConfidence
roleReason
```

避免重复新增 `role` 和 `isPrimary`。

### 3.6 安全与工程清理

已完成：

```text
普通素材更新接口不能伪造 AI role、confidence、reason
阿里云 OSS 异常日志不再直接输出 SDK 原始错误
Smoke 脚本移除队友本机硬编码图片路径
密钥扫描未发现 API Key、OSS Secret
```

## 4. 验证结果

### 4.1 构建与迁移

```text
npm.cmd --prefix apps/api run db:generate   PASS
npm.cmd --prefix apps/api run build         PASS
npm.cmd --prefix apps/web run build         PASS
npx.cmd prisma migrate deploy               PASS
npx.cmd prisma migrate status               Database schema is up to date
git diff --check                            PASS
```

### 4.2 本地 API 回归

使用隔离端口 `3104` 验证，完成后已关闭服务。

```text
GET /api/health                                            PASS
GET /api/products/:productId/materials                     PASS
GET /api/products/:productId/materials/analyze-roles       PASS
PUT /api/products/:productId/materials/:materialId/primary PASS
再次 GET materials，isPrimary 仍存在                       PASS
roleConfidence 与 roleReason 持久化                        PASS
```

### 4.3 定向链路测试

```text
RenderController 将真实商品素材传入 RenderService          PASS
前端 primaryMaterialId 可触发后端主图确认                   PASS
Seedance first_frame 用户确认主图优先                       PASS
API Key / OSS Secret 扫描                                  PASS
```

## 5. 当前结论

Day 11 的阻断问题已经修复，可以作为下一日共同基线。

当前完整主链路为：

```text
上传多张素材
-> Doubao 分类或规则 fallback
-> 用户确认商品主图
-> 刷新后主图仍存在
-> 生成并审核 CreativePlan
-> render 查询真实素材
-> Seedance 1.5 使用 OSS first_frame
-> 远端视频下载到 outputs
-> 前端预览成片
```

## 6. 后续技术债

以下问题不阻断本次合并：

```text
Web 构建仍有大 chunk 提示，AnalyticsPage 约 1.05 MB
真实 OSS publicUrl + Seedance Key 的付费回归仍需在配置 OSS 后补跑
阿里云 OSS 上传可增加超时和重试策略
Seedance 2.0 多参考图仍保持预留状态，不应在 1.5 请求中启用
```
