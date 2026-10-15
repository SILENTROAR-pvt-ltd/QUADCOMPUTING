import * as Sentry from '@sentry/nextjs';

const production = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';

Sentry.init({
	dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN,
	environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
	// Every error is reported; traces are sampled in production (see sentry.server.config.ts).
	tracesSampleRate: production ? 0.1 : 1.0,
	debug: false,
});
