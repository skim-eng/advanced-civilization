const SENSITIVE_QUERY_VALUE = /([?&](?:token|identityToken|access_token|api_key)=)[^&#\s]*/gi;

/** Redact URL query credentials before they reach development or CI logs. */
export function redactSensitiveUrlText(text: string): string {
  return text.replace(SENSITIVE_QUERY_VALUE, '$1[REDACTED]');
}
