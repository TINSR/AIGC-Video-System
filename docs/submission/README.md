# ClipShop AI 最终成果材料

本目录用于比赛评审和项目复核。演示视频使用公开在线播放链接提供，
仓库不存放 MP4 大文件、真实 API Key、本地 `.env` 或内部复核材料。

## 快速评审

1. 阅读[项目完整说明](technical/PROJECT_OVERVIEW.md)。
2. 查看[系统总架构图](diagrams/system-architecture.png)和
   [端到端业务流程图](diagrams/end-to-end-flow.png)。
3. 浏览[产品截图](screenshots/)了解核心交互。
4. 按[运行与部署说明](technical/RUN_AND_DEPLOY.md)启动项目。
5. 通过[API 清单](technical/API_REFERENCE.md)复核前后端契约。

## 技术文档

- [项目完整说明](technical/PROJECT_OVERVIEW.md)
- [运行与部署说明](technical/RUN_AND_DEPLOY.md)
- [API 清单](technical/API_REFERENCE.md)
- [技术难点与解决方案](technical/ENGINEERING_CHALLENGES.md)
- [已知边界](technical/KNOWN_LIMITATIONS.md)

## 架构与流程

- [系统总架构](diagrams/system-architecture.png)
- [端到端业务流程](diagrams/end-to-end-flow.png)
- [多 Agent 协作流程](diagrams/multi-agent-workflow.png)
- [智能素材剪辑 Agent](diagrams/smart-edit-agent.png)
- [双模式成片对比](diagrams/dual-render-modes.png)
- [数据库 ER 图](diagrams/database-er.png)

## 产品截图

- [工作台](screenshots/01_工作台.png)
- [创建商品](screenshots/02_创建商品.png)
- [素材上传与主图确认](screenshots/03_素材上传与主图确认.png)
- [参考视频库](screenshots/04_参考视频库.jpeg)
- [CreativePlan 创意策略](screenshots/07_CreativePlan创意策略.png)
- [分镜编辑器](screenshots/08_分镜编辑器.png)
- [智能素材剪辑](screenshots/09_智能素材剪辑.png)
- [任务进度](screenshots/10_任务进度.png)
- [Seedance 成片](screenshots/11_Seedance成片.png)
- [智能剪辑成片](screenshots/12_智能剪辑成片.png)
- [数据看板](screenshots/13_数据看板.jpeg)

## 数据与安全声明

- 数据看板使用 Mock / CSV 数据，不声称接入真实电商交易后台。
- 参考视频仅保存来源声明和结构化分析结果，不复刻或混剪原视频。
- 外部模型与 OSS 密钥通过本地环境变量配置，禁止提交到 Git。
- 仓库中的环境变量示例均为空值或占位符。
