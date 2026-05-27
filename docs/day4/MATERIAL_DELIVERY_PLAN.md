# 素材传递方案

> Day 4 设计，Day 5 实现

## 问题

当前本地素材路径（`/uploads/xxx`）无法被 Seedance / 火山方舟远端访问。Seedance 目前是纯文生视频，商品一致性依赖 prompt 描述。

## 方案对比

| 方案 | 优点 | 缺点 | 适用场景 |
|------|------|------|----------|
| A: Base64 内嵌 | 不需要对象存储，本地素材直接编码 | 请求体变大，需验证 API 是否支持 | 小图片测试 |
| B: 对象存储公网 URL | 真实项目标准方案 | 需配置密钥和 bucket | 生产环境 |
| C: 文生视频 + 强化描述 | 不影响当前 demo | 商品一致性有限 | Day 4 MVP |

## Day 4 选择：方案 C

当前保持文生视频，通过优化 prompt 结构提升商品描述精度：

- 商品外观描述更详细（颜色、材质、形状、尺寸）
- 全局视觉设定包含色调、光线、镜头风格
- 分镜脚本包含字幕和旁白信息
- 连贯性规则确保商品始终可见

## Day 5 方案 B 实现路径

### 1. 火山 TOS（推荐，与 Seedance 同生态）

```typescript
// 上传素材到 TOS
const tosClient = new TosClient({
  accessKeyId: process.env.TOS_ACCESS_KEY,
  accessKeySecret: process.env.TOS_SECRET_KEY,
  endpoint: 'https://tos-cn-beijing.volces.com',
  region: 'cn-beijing',
});

// 上传后获取公网 URL
const publicUrl = await tosClient.putObject({
  bucket: process.env.TOS_BUCKET,
  key: `materials/${materialId}/${filename}`,
  body: fileBuffer,
});
```

### 2. 阿里 OSS / 腾讯 COS

类似流程，需要：
- 配置 AccessKey
- 创建 bucket 并设置公网可读
- 上传后获取 URL

### 3. Cloudflare R2

S3 兼容 API，免费出口流量。

## 传递给 Seedance 的方式

上传后将公网 URL 放入 Seedance 请求的 `content` 数组：

```typescript
content: [
  {
    type: 'image_url',
    image_url: { url: 'https://bucket.example.com/materials/xxx.jpg' }
  },
  {
    type: 'text',
    text: this.buildPrompt(input)
  }
]
```

## 环境变量

```bash
# 火山 TOS
TOS_ACCESS_KEY=
TOS_SECRET_KEY=
TOS_BUCKET=
TOS_ENDPOINT=https://tos-cn-beijing.volces.com

# 或阿里 OSS
OSS_ACCESS_KEY=
OSS_SECRET_KEY=
OSS_BUCKET=
OSS_REGION=
```
