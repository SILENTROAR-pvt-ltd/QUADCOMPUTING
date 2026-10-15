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

// Headers every page and API response carries. No Content-Security-Policy yet: Supabase, Sentry, fonts and the dish
// photo hosts all need allowances, and a wrong policy blanks the app, so it needs its own tested change.
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
];

/** @type {import('next').NextConfig} */
const nextConfig = {
	// Dev-only "N" badge sat on top of the sidebar's Sign out button.
	devIndicators: { position: 'top-right' },
	// The framework adds `X-Powered-By: Next.js` otherwise: no reason to tell visitors what the server runs.
	poweredByHeader: false,
	images: {
		unoptimized: true,
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
