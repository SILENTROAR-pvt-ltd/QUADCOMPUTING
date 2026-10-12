import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// A simple test route to verify Sentry error tracking in production & local environments
export function GET() {
	throw new Error('Sentry Example API Route Error — Quad Computing / Vibers');
}
