import * as Sentry from '@sentry/nextjs';

const production = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';

Sentry.init({
	dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN,
	environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
	// Every error is reported. Performance traces are sampled in production: tracing every request adds overhead on the
	// order path and would use up a plan's trace quota in the first day.
	tracesSampleRate: production ? 0.1 : 1.0,
	debug: false,
});
