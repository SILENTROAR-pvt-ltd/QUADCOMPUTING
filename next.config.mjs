import { AsyncLocalStorage } from 'node:async_hooks';
import { withSentryConfig } from '@sentry/nextjs/config';

// Polyfill AsyncLocalStorage.snapshot for Node.js < 20
if (AsyncLocalStorage && typeof AsyncLocalStorage.snapshot !== 'function') {
	AsyncLocalStorage.snapshot = function () {
		return function (fn, ...args) {
			return fn(...args);
		};
	};
}
if (typeof globalThis !== 'undefined' && globalThis.AsyncLocalStorage && typeof globalThis.AsyncLocalStorage.snapshot !== 'function') {
	globalThis.AsyncLocalStorage.snapshot = AsyncLocalStorage.snapshot;
}

// The origins the app really loads from: the configured Supabase project (so a custom domain works), Sentry, Google Fonts,
// and Razorpay for the Club checkout. Next's inline bootstrap script needs 'unsafe-inline' (no nonces yet), and the dev
// server needs 'unsafe-eval' for hot reload. Images may come from any https host: dish and venue photos are not fixed.
function contentSecurityPolicy() {
	const isDev = process.env.NODE_ENV !== 'production';
	let supabase = '';
	try {
		if (process.env.NEXT_PUBLIC_SUPABASE_URL) supabase = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin;
	} catch { /* a malformed URL is caught by adminDb at runtime; the policy then uses the wildcard hosts only */ }
	const supabaseSocket = supabase.replace(/^https:/, 'wss:');
	return [
		"default-src 'self'",
		`script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} https://checkout.razorpay.com`,
		"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
		"font-src 'self' data: https://fonts.gstatic.com",
		"img-src 'self' data: blob: https:",
		"media-src 'self' blob: https:",
		`connect-src 'self' ${supabase} ${supabaseSocket} https://*.supabase.co wss://*.supabase.co https://*.sentry.io https://api.razorpay.com`,
		'frame-src https://api.razorpay.com https://checkout.razorpay.com',
		"worker-src 'self' blob:",
		"manifest-src 'self'",
		"object-src 'none'",
		"base-uri 'self'",
		"form-action 'self'",
		"frame-ancestors 'none'",
	].join('; ');
}

// Headers every page and API response carries.
const securityHeaders = [
	// Browsers only use https for this site (a year). No `preload`: that is a permanent commitment to the whole domain.
	{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
	// A response is never reinterpreted as another type (script in an uploaded image, for example).
	{ key: 'X-Content-Type-Options', value: 'nosniff' },
	// The app is never shown inside another site's frame (clickjacking on the bill and the PIN pad). QC uses no iframes.
	{ key: 'X-Frame-Options', value: 'DENY' },
	{ key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
	// QC uses no camera, microphone or payment request. Location is allowed for the Club pages only.
	{ key: 'Permissions-Policy', value: 'camera=(), microphone=(), payment=(), geolocation=(self)' },
	{ key: 'X-DNS-Prefetch-Control', value: 'on' },
	{ key: 'Content-Security-Policy', value: contentSecurityPolicy() },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
	// NEXT_DIST_DIR lets a second server (a dev check beside a running `next start`) build into its own folder
	// instead of overwriting .next. Unset, nothing changes.
	distDir: process.env.NEXT_DIST_DIR || '.next',
	// Dev-only "N" badge sat on top of the sidebar's Sign out button.
	devIndicators: { position: 'top-right' },
	// The framework adds `X-Powered-By: Next.js` otherwise: no reason to tell visitors what the server runs.
	poweredByHeader: false,
	images: {
		unoptimized: true,
	},
	// Versioned API alias: /api/v1/host/* runs the same handler as /api/host/*. Middleware reads the canonical path
	// (lib/middleware/api-path.ts), so the guards apply to both spellings.
	async rewrites() {
		return [{ source: '/api/v1/:path*', destination: '/api/:path*' }];
	},
	async headers() {
		return [
			{ source: '/:path*', headers: securityHeaders },
			// The tracker clips and posters (public/media). Their names carry a version (-v1), so a changed clip gets a new name
			// and every other copy can be kept for a year: a guest downloads each file once, then the browser or the CDN answers.
			{ source: '/media/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
		];
	},
};

export default withSentryConfig(nextConfig, {
	org: process.env.SENTRY_ORG,
	project: process.env.SENTRY_PROJECT,
	silent: !process.env.CI,
	widenClientFileUpload: true,
	disableLogger: true,
});
