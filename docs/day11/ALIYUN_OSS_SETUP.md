# Day11 阿里云 OSS 配置说明

## 环境变量

```env
OBJECT_STORAGE_PROVIDER="aliyun_oss"
ALIYUN_OSS_REGION="oss-cn-hangzhou"
ALIYUN_OSS_BUCKET="your-bucket"
ALIYUN_OSS_ENDPOINT="https://oss-cn-hangzhou.aliyuncs.com"
ALIYUN_OSS_ACCESS_KEY_ID=""
ALIYUN_OSS_ACCESS_KEY_SECRET=""
ALIYUN_OSS_PUBLIC_BASE_URL="https://your-bucket.oss-cn-hangzhou.aliyuncs.com"
```

## 行为

| 场景 | cloudStatus | publicUrl |
|------|-------------|-----------|
| 未配置 OSS | `local_only` | 空 |
| 上传成功 | `uploaded` | `ALIYUN_OSS_PUBLIC_BASE_URL/{objectKey}` |
| 上传失败 | `failed` | 空（本地 `/uploads` 仍保留） |

## 公开 Bucket vs 私有 Bucket

- **公开读 Bucket**：`ALIYUN_OSS_PUBLIC_BASE_URL` 拼永久 URL，供 Seedance `first_frame` 拉取。
- **私有 Bucket**：需 CDN 或预签名 URL；Day11 不实现自动刷新，请在控制台配置公共读或使用 CDN 域名作为 `PUBLIC_BASE_URL`。

## 与 S3 兼容存储共存

设置 `OBJECT_STORAGE_PROVIDER` 为 `tos` 等且配置 `OBJECT_STORAGE_*` 时，仍走 Day10 S3 兼容 PUT。  
设置 `aliyun_oss` 且配置 `ALIYUN_OSS_*` 时，使用官方 `ali-oss` SDK。

## 本地回归

```text
upload image -> PUT .../materials/:id/primary -> cloudStatus uploaded
-> render with Seedance Key -> first_frame uses publicUrl
```

勿将 AccessKey / Secret 提交到 git。
