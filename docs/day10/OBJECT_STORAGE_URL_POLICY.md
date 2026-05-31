# Day10 对象存储 URL 策略

## publicUrl 类型

- 默认使用 **OBJECT_STORAGE_PUBLIC_BASE_URL** 拼接对象 key，视为 **长期可访问的公网 URL**（桶公共读或 CDN 域名）。
- 若桶为私有，需在 TOS/OSS 控制台配置公共读或使用 CDN；Day10 **不实现**签名 URL 自动刷新。

## 未配置对象存储

- `cloudStatus = local_only`
- `fileUrl` 仍为 `/uploads/...`，本地演示链路不变。

## 上传失败

- 保留本地文件，`cloudStatus = failed`
- `publicUrl` 为空；Seedance 回退纯 prompt 或本地 base64 调试（非正式主链路）。

## 临时签名 URL（后续）

- 若改用私有桶 + 预签名 URL，需单独接口刷新 `publicUrl`，不在 Day10 范围。
