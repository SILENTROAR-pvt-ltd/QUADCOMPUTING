import { AsyncLocalStorage } from 'node:async_hooks';

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

/** @type {import('next').NextConfig} */
const nextConfig = {
	// Dev-only "N" badge sat on top of the sidebar's Sign out button.
	devIndicators: { position: 'top-right' },
	images: {
		unoptimized: true,
	},
};

export default nextConfig;
