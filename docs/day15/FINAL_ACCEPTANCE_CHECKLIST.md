# Day 15 最终验收清单

## 1. 构建

- [ ] `npm.cmd --prefix apps/api run db:generate`
- [ ] `npm.cmd --prefix apps/api run build`
- [ ] `npm.cmd --prefix apps/web run build`
- [ ] `git diff --check`

## 2. 数据库

- [ ] Prisma migration deploy 成功。
- [ ] Product 可写入。
- [ ] Material 可写入。
- [ ] ReferenceVideo 可写入。
- [ ] InspirationTemplate 可写入。
- [ ] CreativePlan 可写入。
- [ ] GenerationTask 可写入。
- [ ] VideoPerformanceMetric 可写入。

## 3. 主链路

- [ ] 创建商品。
- [ ] 上传素材。
- [ ] OSS publicUrl 可用或 local fallback 清晰。
- [ ] 素材角色分析。
- [ ] 设置主图。
- [ ] 生成 CreativePlan。
- [ ] `merchantAdCopy` 生效。
- [ ] 选择模板生成。
- [ ] `TemplateInspiration` trace 存在。
- [ ] 分镜可编辑。
- [ ] 分镜预览可用。
- [ ] approve 可用。
- [ ] render 可用。
- [ ] `/outputs/*.mp4` HTTP 200。

## 4. 参考视频与模板

- [ ] 参考视频库可打开。
- [ ] 参考视频可分析或已有分析样例。
- [ ] 分析报告显示 summary、hookType、sellingPoints、style、scenes、ctaType。
- [ ] 模板库可打开。
- [ ] 内置模板可初始化。
- [ ] 模板可归纳。
- [ ] 商品模板推荐有 score 和 reasons。
- [ ] 模板详情可跳转生成。

## 5. 数据回流

- [ ] Mock seed 可用。
- [ ] Mock reset 可用。
- [ ] CSV 导入可用或明确降级。
- [ ] 导入批次可展示。
- [ ] 看板显示总播放、点击、转化、点击率、转化率、完播率。
- [ ] 模板效果排行可展示。
- [ ] 模板对比可展示。
- [ ] 推荐理由包含历史效果。

## 6. 真实模型

- [ ] Doubao LLM 可生成 CreativePlan。
- [ ] Doubao 视频理解可分析参考视频，或提供已分析样例。
- [ ] Seedance 1.5 可生成视频。
- [ ] Seedance 失败时 FFmpeg fallback 可控。
- [ ] 真实 Key 只在本地 `.env`。

## 7. 文档

- [ ] README。
- [ ] 架构图。
- [ ] Agent 流程图。
- [ ] API 清单。
- [ ] 环境变量说明。
- [ ] 启动步骤。
- [ ] 演示脚本。
- [ ] 已知边界。

## 8. 交付安全

- [ ] `.env` 未提交。
- [ ] API Key 未提交。
- [ ] OSS Secret 未提交。
- [ ] `uploads` 大文件不乱提交。
- [ ] `outputs` 只提交必要演示样例或不提交。
- [ ] `dist` 不提交，除非项目明确需要。

## 9. 最终判断

可以提交的最低条件：

```text
API build 通过
Web build 通过
真实 Seedance 或 FFmpeg fallback 至少一个成片可访问
README 能让评委本地跑起来
演示视频能完整展示主链路
无密钥泄露
```

