import { deploymentSecurityHeaders } from '../src/server/deployment-security.js';

interface Env {
  SUPABASE_URL?: string;
}

/** Root Pages middleware: the private-stage policy applies equally to static
 * SPA assets and Functions. Cloudflare Access remains the authentication gate;
 * these headers are defense in depth and indexing/cache suppression. */
export const onRequest: PagesFunction<Env> = async (context) => {
  const response = await context.next();
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(deploymentSecurityHeaders(context.env.SUPABASE_URL))) {
    headers.set(name, value);
  }
  if (new URL(context.request.url).pathname.startsWith('/api/')) {
    headers.set('cache-control', 'no-store');
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};
