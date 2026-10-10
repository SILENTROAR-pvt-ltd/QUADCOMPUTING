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

// Rate limiting is per-instance without Redis, so limits are meaningless once there is more than one instance.
need('UPSTASH_REDIS_REST_URL', 'shared rate-limit store');
need('UPSTASH_REDIS_REST_TOKEN', 'shared rate-limit store');
if (env.RATE_LIMIT_REQUIRE_REDIS !== '1') {
  errors.push('RATE_LIMIT_REQUIRE_REDIS must be "1" so the limiter fails closed instead of silently degrading to per-instance memory');
}

if (!env.LLM_API_KEY) warnings.push('LLM_API_KEY is not set: menu scan and dish-photo matching run without the language model (exact matching still works)');

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

errors.forEach((e) => (strict ? console.error : console.warn)(`  ${strict ? 'FAIL' : 'warn'}  ${e}`));
if (strict) {
  console.error(`[verify-env] ${errors.length} problem(s). Fix the environment variables and redeploy.`);
  process.exit(1);
}
console.log(`[verify-env] ${errors.length} item(s) would fail a production build.`);
