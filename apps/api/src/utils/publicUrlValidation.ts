const VIDEO_EXTENSION_RE = /\.(mp4|mov|webm|avi)(?:[?#]|$)/i;

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'metadata.google.internal',
  'metadata.google.com',
  '169.254.169.254',
]);

function isPrivateOrReservedIPv4(hostname: string): boolean {
  if (hostname === '0.0.0.0') return true;
  if (hostname.startsWith('127.')) return true;
  if (hostname.startsWith('10.')) return true;
  if (hostname.startsWith('192.168.')) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(hostname)) return true;
  if (hostname.startsWith('169.254.')) return true;
  return false;
}

function isPrivateOrReservedIPv6(hostname: string): boolean {
  if (hostname === '::' || hostname === '0:0:0:0:0:0:0:0') return true;
  if (hostname === '::1' || hostname === '0:0:0:0:0:0:0:1') return true;
  if (/^fe[89ab][0-9a-f]?:/i.test(hostname)) return true;
  if (/^f[cd]/i.test(hostname)) return true;

  if (/^::ffff:/i.test(hostname)) {
    const ipv4Part = hostname.slice(7);
    if (/^\d+\.\d+\.\d+\.\d+$/.test(ipv4Part)) {
      return isPrivateOrReservedIPv4(ipv4Part);
    }
    if (/^7f[0-9a-f]{2}:/i.test(ipv4Part)) return true;
    if (/^00?0a:/i.test(ipv4Part)) return true;
    if (/^c0a8:/i.test(ipv4Part)) return true;
    if (/^ac1[0-9a-f]:/i.test(ipv4Part)) return true;
    if (/^a9fe:/i.test(ipv4Part)) return true;
  }

  return false;
}

/**
 * Rejects obvious SSRF targets before a reference video URL is persisted or sent
 * to an external provider. Callers performing outbound requests must additionally
 * validate DNS resolution and every redirect target.
 */
export function isPublicHttpUrl(
  url: string,
  options?: { rejectUploadsPath?: boolean; requireVideoExtension?: boolean }
): boolean {
  try {
    const parsed = new URL(url.trim());
    const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    if (options?.rejectUploadsPath !== false && /\/uploads\//i.test(parsed.pathname)) return false;
    if (options?.requireVideoExtension !== false && !VIDEO_EXTENSION_RE.test(parsed.pathname)) return false;
    if (BLOCKED_HOSTNAMES.has(hostname) || hostname.endsWith('.localhost')) return false;
    if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname) && isPrivateOrReservedIPv4(hostname)) return false;
    if (hostname.includes(':') && isPrivateOrReservedIPv6(hostname)) return false;

    return true;
  } catch {
    return false;
  }
}

export function assertPublicHttpUrl(url: string, label = 'URL'): void {
  if (!isPublicHttpUrl(url)) {
    throw new Error(`${label} 必须是可直接播放的公网 http/https 视频文件地址，不能是平台页面、localhost、内网或 file 协议`);
  }
}

export async function assertPublicHttpUrlWithDns(url: string, label = 'URL'): Promise<void> {
  assertPublicHttpUrl(url, label);

  const hostname = new URL(url.trim()).hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname) || hostname.includes(':')) return;

  let addresses: Array<{ address: string }>;
  try {
    addresses = await lookup(hostname, { all: true });
  } catch {
    throw new Error(`${label} 域名无法解析，请检查公网视频文件地址`);
  }

  if (
    addresses.length === 0
    || addresses.some(({ address }) =>
      isPrivateOrReservedIPv4(address)
      || isPrivateOrReservedIPv6(address.toLowerCase())
    )
  ) {
    throw new Error(`${label} 解析到了内网或保留地址，已拒绝访问`);
  }
}
import { lookup } from 'dns/promises';
