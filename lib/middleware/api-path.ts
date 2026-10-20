/**
 * The versioned API prefix is a rewrite: `/api/v1/x` runs the handler at `/api/x` (next.config.mjs). Middleware runs before
 * rewrites and decides its guards by path, so it must read the path the handler will run for. Otherwise a versioned call
 * would skip the host and admin guards.
 */
const VERSION_PREFIX = /^\/api\/v1(?=\/|$)/;

export function canonicalApiPath(pathname: string): string {
  return pathname.replace(VERSION_PREFIX, '/api');
}
