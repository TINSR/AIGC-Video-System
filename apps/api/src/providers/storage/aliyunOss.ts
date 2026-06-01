import type { CloudUploadResult } from './objectStorage';

export type AliyunOssConfig = {
  region: string;
  bucket: string;
  endpoint: string;
  accessKeyId: string;
  accessKeySecret: string;
  publicBaseUrl: string;
};

export function getAliyunOssConfig(): AliyunOssConfig | null {
  const accessKeyId = process.env.ALIYUN_OSS_ACCESS_KEY_ID?.trim();
  const accessKeySecret = process.env.ALIYUN_OSS_ACCESS_KEY_SECRET?.trim();
  const bucket = process.env.ALIYUN_OSS_BUCKET?.trim();
  const endpoint = (process.env.ALIYUN_OSS_ENDPOINT || '').trim();
  const region = (process.env.ALIYUN_OSS_REGION || '').trim();
  const publicBaseUrl = (process.env.ALIYUN_OSS_PUBLIC_BASE_URL || '').trim().replace(/\/$/, '');

  if (!accessKeyId || !accessKeySecret || !bucket || !endpoint || !region || !publicBaseUrl) {
    return null;
  }

  return { region, bucket, endpoint, accessKeyId, accessKeySecret, publicBaseUrl };
}

export async function uploadToAliyunOss(
  objectKey: string,
  body: Buffer,
  contentType: string
): Promise<CloudUploadResult> {
  const config = getAliyunOssConfig();
  if (!config) {
    return { ok: false, reason: 'aliyun oss not configured' };
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const OSS = require('ali-oss') as new (options: Record<string, string>) => {
      put: (name: string, data: Buffer, options?: { headers?: Record<string, string> }) => Promise<unknown>;
    };

    const client = new OSS({
      region: config.region,
      bucket: config.bucket,
      endpoint: config.endpoint,
      accessKeyId: config.accessKeyId,
      accessKeySecret: config.accessKeySecret,
    });

    await client.put(objectKey, body, {
      headers: { 'Content-Type': contentType },
    });

    const publicUrl = `${config.publicBaseUrl}/${objectKey}`;
    return { ok: true, publicUrl, objectKey };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, reason: message };
  }
}
