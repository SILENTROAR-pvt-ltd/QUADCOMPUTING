// lib/utils/api-response.ts
import { NextResponse } from 'next/server';
import { generateCorrelationId } from '@/lib/middleware/error-handler';

export interface StandardApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  correlationId?: string;
}

export function apiSuccess<T>(data: T, status = 200, init?: ResponseInit) {
  return NextResponse.json({ success: true, data }, { status, ...init });
}

export function apiError(
  error: string,
  code = 'BAD_REQUEST',
  status = 400,
  init?: ResponseInit & { correlationId?: string }
) {
  const correlationId = init?.correlationId || (status >= 500 ? generateCorrelationId() : undefined);
  const headers = new Headers(init?.headers);
  if (correlationId) {
    headers.set('x-correlation-id', correlationId);
  }

  return NextResponse.json(
    {
      success: false,
      error,
      code,
      ...(correlationId ? { correlationId } : {}),
    },
    { status, ...init, headers }
  );
}

export function apiServerError(
  error: unknown,
  correlationId?: string,
  customMessage?: string
) {
  const cid = correlationId || generateCorrelationId();
  const msg = customMessage || (error instanceof Error ? error.message : 'Internal Server Error');

  console.error(`[API Server Error] [${cid}]`, error);

  return NextResponse.json(
    {
      success: false,
      error: 'Internal Server Error',
      code: 'INTERNAL_SERVER_ERROR',
      correlationId: cid,
    },
    {
      status: 500,
      headers: {
        'x-correlation-id': cid,
      },
    }
  );
}
