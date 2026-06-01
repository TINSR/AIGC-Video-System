/**
 * Validates that a URL is a public HTTP(S) endpoint (SSRF-safe for outbound fetch).
 */
export function isPublicHttpUrl(url: string, options?: { rejectUploadsPath?: boolean }): boolean {
  try {
    const parsed = new URL(url.trim());
    const hostname = parsed.hostname.toLowerCase();
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    if (options?.rejectUploadsPath !== false && /\/uploads\//i.test(parsed.pathname)) return false;
    if (
      hostname === 'localhost'
      || hostname === '0.0.0.0'
      || hostname === '::1'
      || hostname === '127.0.0.1'
      || hostname.endsWith('.localhost')
      || hostname.startsWith('10.')
      || hostname.startsWith('192.168.')
      || /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function assertPublicHttpUrl(url: string, label = 'URL'): void {
  if (!isPublicHttpUrl(url)) {
    throw new Error(`${label} 必须是可公网访问的 http/https 地址，不能是 localhost、内网或 file 协议`);
  }
}
