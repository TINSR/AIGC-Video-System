import { createHash, createHmac } from 'crypto';

export type ObjectStorageConfig = {
  provider: string;
  endpoint: string;
  region: string;
  bucket: string;
  accessKey: string;
  secretKey: string;
  publicBaseUrl: string;
};

export type CloudUploadResult =
  | { ok: true; publicUrl: string; objectKey: string }
  | { ok: false; reason: string };

function sha256(data: string | Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}

function hmac(key: string | Buffer, data: string): Buffer {
  return createHmac('sha256', key).update(data, 'utf8').digest();
}

function encodeRfc3986(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

export function getObjectStorageConfig(): ObjectStorageConfig | null {
  const accessKey = process.env.OBJECT_STORAGE_ACCESS_KEY?.trim();
  const secretKey = process.env.OBJECT_STORAGE_SECRET_KEY?.trim();
  const bucket = process.env.OBJECT_STORAGE_BUCKET?.trim();
  const endpoint = (process.env.OBJECT_STORAGE_ENDPOINT || '').trim().replace(/\/$/, '');
  const region = (process.env.OBJECT_STORAGE_REGION || 'cn-beijing').trim();
  const publicBaseUrl = (process.env.OBJECT_STORAGE_PUBLIC_BASE_URL || '').trim().replace(/\/$/, '');

  if (!accessKey || !secretKey || !bucket || !endpoint || !publicBaseUrl) {
    return null;
  }

  return {
    provider: (process.env.OBJECT_STORAGE_PROVIDER || 'tos').trim(),
    endpoint,
    region,
    bucket,
    accessKey,
    secretKey,
    publicBaseUrl,
  };
}

export function isObjectStorageConfigured(): boolean {
  return getObjectStorageConfig() !== null;
}

/**
 * S3-compatible PUT (Volcengine TOS / generic OSS). Uses permanent public URL from OBJECT_STORAGE_PUBLIC_BASE_URL.
 */
export async function uploadToObjectStorage(
  objectKey: string,
  body: Buffer,
  contentType: string
): Promise<CloudUploadResult> {
  const config = getObjectStorageConfig();
  if (!config) {
    return { ok: false, reason: 'object storage not configured' };
  }

  try {
    const host = new URL(config.endpoint).host;
    const encodedKey = objectKey.split('/').map(encodeRfc3986).join('/');
    const canonicalUri = `/${config.bucket}/${encodedKey}`;
    const url = `${config.endpoint}${canonicalUri}`;
    const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);
    const payloadHash = sha256(body);

    const canonicalHeaders =
      `content-type:${contentType}\n` +
      `host:${host}\n` +
      `x-amz-content-sha256:${payloadHash}\n` +
      `x-amz-date:${amzDate}\n`;
    const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';

    const canonicalRequest = [
      'PUT',
      canonicalUri,
      '',
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join('\n');

    const credentialScope = `${dateStamp}/${config.region}/s3/aws4_request`;
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      sha256(canonicalRequest),
    ].join('\n');

    const kDate = hmac(`AWS4${config.secretKey}`, dateStamp);
    const kRegion = hmac(kDate, config.region);
    const kService = hmac(kRegion, 's3');
    const kSigning = hmac(kService, 'aws4_request');
    const signature = hmac(kSigning, stringToSign).toString('hex');

    const authorization =
      `AWS4-HMAC-SHA256 Credential=${config.accessKey}/${credentialScope}, ` +
      `SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
        Host: host,
        'x-amz-date': amzDate,
        'x-amz-content-sha256': payloadHash,
        Authorization: authorization,
      },
      body: new Uint8Array(body),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      return { ok: false, reason: `upload http ${response.status}: ${text.slice(0, 200)}` };
    }

    const publicUrl = `${config.publicBaseUrl}/${objectKey}`;
    return { ok: true, publicUrl, objectKey };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, reason: message };
  }
}
