# Day 15 最终交付指挥台

> 当前最终基线：`origin/codex/day15-baseline @ 381c043`  
> Day15 定位：不再开发新功能，只做回归、修阻塞 Bug、文档、录屏、密钥检查和最终提交。

## 1. 当前验收状态

已确认：

```text
npm.cmd --prefix apps/api run db:generate 通过
npm.cmd --prefix apps/api run build       通过
npm.cmd --prefix apps/web run build       通过
git diff --check                          通过
```

前端仍有 Analytics chunk 超过 500 KB 的 Vite warning，不阻塞比赛提交。

## 2. 当前核心能力

```text
商品创建
素材上传
阿里云 OSS 边界
素材角色分析
商品主图确认
参考视频导入
Doubao 视频理解
参考视频结构化拆解
灵感模板库
模板归纳
模板推荐
模板真实注入剧本生成
merchantAdCopy 注入
CreativePlan 审核
分镜编辑
分镜预览
Seedance 1.5 真实生成
FFmpeg fallback
任务进度
视频预览
Mock / CSV 指标回流
模板效果排行
模板效果对比
推荐理由包含历史效果
```

## 3. Day15 禁止事项

今天不要再做：

```text
真实抖音 OAuth
真实交易后台对接
向量数据库
复杂聚类算法
Seedance 2.0 正式迁移
多语言 TTS
大规模爬虫
UI 大改版
数据库大重构
新业务功能
```

只允许修复：

```text
构建失败
主链路失败
页面白屏
密钥泄露
README 错误
演示路径阻塞
```

## 4. 最终冒烟链路

至少跑通一次：

```text
1. 启动 MySQL
2. 启动 API
3. 启动 Web
4. 创建商品：旅行收纳包
5. 填写卖点：
   - 多隔层分类收纳
   - 防泼水面料
   - 双向拉链，开合方便
6. 上传商品主图
7. 分析素材角色
8. 设置主图
9. 导入或打开一条参考视频
10. 完成参考视频分析
11. 初始化内置模板
12. 归纳或选择“痛点转化型”
13. 生成 CreativePlan
14. Review 页确认：
    - templateId 存在
    - TemplateInspiration trace 存在
    - merchantAdCopy 影响广告词
15. 编辑一个分镜
16. approve
17. render
18. 等待 Seedance 成功
19. 打开 /outputs mp4
20. 初始化 Mock 指标
21. 打开数据看板
22. 查看模板效果排行和推荐理由
```

## 5. 最终检查命令

```bash
git fetch origin
git checkout codex/day14-review
npm install
npm.cmd --prefix apps/api run db:generate
npm.cmd --prefix apps/api run build
npm.cmd --prefix apps/web run build
git diff --check
```

如果要用远端最终基线重新开干净分支：

```bash
git fetch origin
git checkout -b codex/final-delivery origin/codex/day15-baseline
```

## 6. 真实 Key 验收

本地 `.env` 需要有：

```text
DATABASE_URL
REAL_LLM_API_KEY
REAL_LLM_BASE_URL
REAL_LLM_MODEL
SEEDANCE_API_KEY
SEEDANCE_API_BASE_URL
SEEDANCE_MODEL_ID
OBJECT_STORAGE_PROVIDER
ALIYUN_OSS_*
ALLOW_FFMPEG_FALLBACK=true
```

验收时记录：

```text
LLM 生成耗时
Seedance 任务 ID
Seedance 生成耗时
输出 MP4 路径
MP4 文件大小
HTTP 访问状态
```

## 7. 密钥扫描

必须检查：

```bash
git status --short
git diff --cached
git grep -n "ark-|sk-|AKIA|ALIYUN_OSS_ACCESS_KEY_SECRET|SEEDANCE_API_KEY|REAL_LLM_API_KEY" -- .
```

允许 `.env.example` 中存在空占位，不允许真实 Key 进入 Git。

## 8. README 必须包含

```text
项目简介
比赛题目对应关系
核心功能
架构图
Agent 流程图
技术栈
本地启动步骤
环境变量说明
数据库迁移步骤
Seedance / Doubao / OSS 配置说明
演示路径
已知边界
未来扩展
```

## 9. 答辩讲法

一句话：

```text
这是一个面向电商商家的 AIGC 带货视频生成系统，支持从商品素材理解、参考视频拆解、灵感模板沉淀、多 Agent 剧本生成，到 Seedance 成片和数据回流推荐的完整闭环。
```

亮点顺序：

```text
1. 生成前可审核，不是黑盒
2. 多 Agent 拆解：商品分析、策略、VisualBible、脚本、分镜、Prompt、合规、连贯性
3. 参考视频只做结构化拆解，不混剪原片
4. 模板库沉淀策略、因子和约束
5. Seedance 真实生成，FFmpeg fallback 保证演示稳定
6. Mock / CSV 数据回流，让系统能解释为什么推荐某个模板
```

## 10. 录屏脚本

3-5 分钟：

```text
00:00 项目介绍和工作台
00:20 创建旅行收纳包商品
00:45 上传商品图并确认主图
01:10 展示参考视频拆解报告
01:40 打开模板库，选择痛点转化型
02:00 生成 CreativePlan，展示 TemplateInspiration trace
02:40 编辑分镜并 approve
03:00 Seedance 渲染任务和成片
03:40 数据看板，初始化 Mock 指标
04:10 模板效果排行与推荐理由
04:40 总结系统闭环和扩展边界
```

## 11. 最终交付物

```text
GitHub 仓库
README
运行截图
演示视频
1 条真实生成 MP4
架构图
Agent 流程图
API 清单
环境变量样例
最终审查报告
```

## 12. Day15 分工

### 前端

```text
按录屏脚本走一遍页面
修白屏和明显错字
截图工作台、参考视频库、模板库、审核页、成片页、数据看板
确认移动端不作为本次阻塞
```

### 后端

```text
迁移数据库
跑 API build
跑主链路 smoke
检查 outputs 静态访问
检查 CSV / Mock 指标接口
检查 .env 未入库
```

### AI / 视频

```text
跑真实 Doubao 生成
跑真实 Seedance 生成
保存任务 ID、耗时和 MP4
确认 TemplateInspiration trace
确认 merchantAdCopy 生效
准备答辩中的 Agent 流程解释
```

