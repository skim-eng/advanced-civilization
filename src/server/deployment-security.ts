const BASE_CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' blob: data:",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
];

function supabaseConnectSources(supabaseUrl?: string): string[] {
  if (!supabaseUrl) return [];
  try {
    const url = new URL(supabaseUrl);
    if (url.protocol !== 'https:' || !url.hostname.endsWith('.supabase.co')) return [];
    return [url.origin, `wss://${url.host}`];
  } catch {
    return [];
  }
}

/** Security policy shared by the SPA, static assets, and Pages Functions. */
export function deploymentSecurityHeaders(supabaseUrl?: string): Record<string, string> {
  const connectSrc = ["'self'", ...supabaseConnectSources(supabaseUrl)].join(' ');
  return {
    'content-security-policy': [...BASE_CSP, `connect-src ${connectSrc}`].join('; '),
    'referrer-policy': 'no-referrer',
    'x-content-type-options': 'nosniff',
    'strict-transport-security': 'max-age=31536000',
    'x-frame-options': 'DENY',
    'permissions-policy': 'accelerometer=(), ambient-light-sensor=(), autoplay=(), battery=(), camera=(), display-capture=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), midi=(), payment=(), usb=()',
    'x-robots-tag': 'noindex, nofollow, noarchive',
  };
}

/** Browsers may call write routes only from the exact application origin.
 * Raw server-side clients omit Origin and remain usable behind Cloudflare
 * Access. No Access-Control-Allow-Origin header is emitted anywhere. */
export function isAllowedWriteOrigin(requestUrl: URL, method: string, origin: string | null): boolean {
  if (method === 'GET' || method === 'HEAD') return true;
  if (!origin) return true;
  try {
    return new URL(origin).origin === requestUrl.origin;
  } catch {
    return false;
  }
}
