import { describe, expect, it } from 'vitest';
import { hasReportAdminAuthorization, reportAdminConfig } from './report-admin.js';

const TOKEN = 'test-report-admin-token-more-than-thirty-two-characters';

describe('report administration configuration', () => {
  it('is absent by default even if a credential is inherited', () => {
    expect(reportAdminConfig((key) => key === 'REPORT_ADMIN_TOKEN' ? TOKEN : undefined)).toBeUndefined();
  });

  it('requires a strong server-side credential when explicitly enabled', () => {
    expect(() => reportAdminConfig((key) => key === 'REPORT_ADMIN_ENABLED' ? 'true' : undefined)).toThrow(/REPORT_ADMIN_TOKEN/);
  });

  it('accepts only an Authorization bearer value with the configured token', async () => {
    const config = { token: TOKEN };
    await expect(hasReportAdminAuthorization(undefined, config)).resolves.toBe(false);
    await expect(hasReportAdminAuthorization(`Bearer ${TOKEN}-wrong`, config)).resolves.toBe(false);
    await expect(hasReportAdminAuthorization(`Bearer ${TOKEN}`, config)).resolves.toBe(true);
  });
});
