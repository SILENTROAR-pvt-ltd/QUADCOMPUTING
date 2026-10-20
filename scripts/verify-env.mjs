// Fails the build when a PRODUCTION deployment is missing configuration that the app treats as
// mandatory. Previews and local builds only warn, so they keep working without secrets.
//
//   production = VERCEL_ENV=production, or VERIFY_ENV_STRICT=1 (use this in any other CI/CD)
//
// Run: node scripts/verify-env.mjs
const env = process.env;
const strict = env.VERCEL_ENV === 'production' || env.VERIFY_ENV_STRICT === '1';

const errors = [];
const warnings = [];
const need = (name, why) => { if (!env[name] || !String(env[name]).trim()) errors.push(`${name} is not set (${why})`); };

function jwtRole(token) {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const json = Buffer.from(part.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
    return JSON.parse(json).role ?? null;
  } catch {
    return null; // not a JWT (e.g. the newer sb_secret_ key format): skip the role check
  }
}

need('NEXT_PUBLIC_SUPABASE_URL', 'database API URL');
need('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'browser client key');
need('SUPABASE_SERVICE_ROLE_KEY', 'server-side admin access; the app refuses to start admin queries without it');

if (env.NEXT_PUBLIC_SUPABASE_URL && !/^https:\/\//.test(env.NEXT_PUBLIC_SUPABASE_URL)) {
  errors.push('NEXT_PUBLIC_SUPABASE_URL must be an https:// URL in production');
}

const service = env.SUPABASE_SERVICE_ROLE_KEY;
if (service) {
  if (service === env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    errors.push('SUPABASE_SERVICE_ROLE_KEY equals the anon key: admin queries would run under RLS');
  }
  const role = jwtRole(service);
  if (role && role !== 'service_role') {
    errors.push(`SUPABASE_SERVICE_ROLE_KEY is a JWT with role "${role}", expected "service_role"`);
  }
}

// Rate limiting uses Upstash Redis for distributed multi-instance deployments,
// or degrades to per-instance memory store when Redis credentials are not provided.
if (env.RATE_LIMIT_REQUIRE_REDIS === '1') {
  need('UPSTASH_REDIS_REST_URL', 'shared rate-limit store required by RATE_LIMIT_REQUIRE_REDIS=1');
  need('UPSTASH_REDIS_REST_TOKEN', 'shared rate-limit store required by RATE_LIMIT_REQUIRE_REDIS=1');
} else if (env.UPSTASH_REDIS_REST_URL || env.UPSTASH_REDIS_REST_TOKEN) {
  need('UPSTASH_REDIS_REST_URL', 'shared rate-limit store');
  need('UPSTASH_REDIS_REST_TOKEN', 'shared rate-limit store');
} else {
  warnings.push('UPSTASH_REDIS_REST_URL/TOKEN not configured: rate limiting will fall back to per-instance memory store');
}

// Without a DSN nothing reaches Sentry: a production error would go unseen. A warning, not a failure, so a deploy is
// never blocked for it; set VERIFY_SENTRY_REQUIRED=1 to make it a hard requirement.
if (!env.NEXT_PUBLIC_SENTRY_DSN && !env.SENTRY_DSN) {
  const msg = 'NEXT_PUBLIC_SENTRY_DSN is not set: production errors will not be reported to Sentry';
  if (env.VERIFY_SENTRY_REQUIRED === '1') errors.push(msg); else warnings.push(msg);
}
if (strict && !env.UPSTASH_REDIS_REST_URL) {
  warnings.push('Production without Upstash: rate limits and duplicate-order guards are per server instance, not shared between instances');
}

if (!env.LLM_API_KEY) warnings.push('LLM_API_KEY is not set: menu scan and dish-photo matching run without the language model (exact matching still works)');

// A preview or development build runs branch code (this script, the tests, next.config.mjs) in a container holding
// its environment. Such a build must therefore never hold the production database: QC_PRODUCTION_SUPABASE_HOST is a
// plain variable set on every Vercel scope naming the production project's host, and a non-production build whose
// Supabase URL points at it fails here, before any branch code sees a production key.
const vercelEnv = env.VERCEL_ENV || '';
const productionHost = (env.QC_PRODUCTION_SUPABASE_HOST || '').trim().toLowerCase();
if (vercelEnv && vercelEnv !== 'production') {
  if (!productionHost) {
    warnings.push('QC_PRODUCTION_SUPABASE_HOST is not set: a preview build cannot prove it is not pointed at the production database');
  } else {
    let host = '';
    try { host = new URL(env.NEXT_PUBLIC_SUPABASE_URL || '').host.toLowerCase(); } catch {}
    if (host && host === productionHost) {
      errors.push(`${vercelEnv} build is configured with the production Supabase project (${host}); scope SUPABASE_* for Preview/Development to the staging project`);
    }
  }
}

// Off Vercel, the rate limiter trusts no forwarded header until the proxies in front of the app are declared; until
// then every client shares one limit (lib/middleware/rate-limiter.ts).
if (!env.VERCEL && !env.TRUSTED_PROXY_HOPS && env.TRUST_CF_CONNECTING_IP !== '1') {
  warnings.push('TRUSTED_PROXY_HOPS is not set: outside Vercel, rate limits are applied per deployment, not per client, until the proxy depth is declared');
}

for (const name of Object.keys(env)) {
  if (name.startsWith('NEXT_PUBLIC_') && /(SERVICE|SECRET|PRIVATE|PASSWORD)/i.test(name)) {
    errors.push(`${name} is exposed to the browser bundle because of its NEXT_PUBLIC_ prefix`);
  }
}

const label = strict ? 'production' : 'non-production (warnings only)';
console.log(`[verify-env] checking ${label} configuration`);
warnings.forEach((w) => console.warn(`  warn  ${w}`));

if (errors.length === 0) {
  console.log('[verify-env] OK');
  process.exit(0);
}

// The preview-scope check fails any Vercel build it applies to, strict or not: it is the one error a preview must stop on.
const previewLeak = errors.find((e) => /production Supabase project/.test(e));
if (previewLeak && !strict) {
  console.error(`  FAIL  ${previewLeak}`);
  process.exit(1);
}

errors.forEach((e) => (strict ? console.error : console.warn)(`  ${strict ? 'FAIL' : 'warn'}  ${e}`));
if (strict) {
  console.error(`[verify-env] ${errors.length} problem(s). Fix the environment variables and redeploy.`);
  process.exit(1);
}
console.log(`[verify-env] ${errors.length} item(s) would fail a production build.`);
