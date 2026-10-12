import * as Sentry from '@sentry/nextjs';

Sentry.init({
	dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
	// Trace sample rate (1.0 = 100% of transactions for performance monitoring)
	tracesSampleRate: 1.0,
	debug: false,
});
