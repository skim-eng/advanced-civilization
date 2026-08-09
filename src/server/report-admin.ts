export interface ReportAdminConfig {
  token: string;
}

/** Report triage is absent by default and cannot be enabled by a token alone. */
export function reportAdminConfig(get: (key: string) => string | undefined): ReportAdminConfig | undefined {
  if (get('REPORT_ADMIN_ENABLED') !== 'true') return undefined;
  const token = get('REPORT_ADMIN_TOKEN');
  if (!token || token.length < 32) throw new Error('REPORT_ADMIN_TOKEN must contain at least 32 characters when report administration is enabled');
  return { token };
}

async function digest(value: string): Promise<Uint8Array> {
  return new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
}

export async function hasReportAdminAuthorization(authorization: string | undefined, config: ReportAdminConfig): Promise<boolean> {
  const prefix = 'Bearer ';
  const supplied = authorization?.startsWith(prefix) ? authorization.slice(prefix.length) : '';
  const [left, right] = await Promise.all([digest(supplied), digest(config.token)]);
  let different = left.length ^ right.length;
  for (let index = 0; index < Math.max(left.length, right.length); index++) {
    different |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }
  return different === 0;
}
