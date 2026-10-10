// lib/middleware/error-handler.ts
import { NextResponse } from 'next/server';

export interface StandardApiErrorBody {
  success: false;
  error: string;
  code: string;
  correlationId: string;
  details?: any;
  debugMessage?: string;
}

/**
 * Generate a unique correlation ID for tracing and observability
 */
export function generateCorrelationId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 9);
  return `cid_${ts}_${rand}`;
}

/**
 * Extract or generate correlation ID from incoming request headers
 */
export function getCorrelationId(request?: Request): string {
  const existing = request?.headers?.get('x-correlation-id');
  if (existing && existing.trim()) {
    return existing.trim();
  }
  return generateCorrelationId();
}

/**
 * Standardized server error logger & response creator
 */
export function handleApiError(
  error: unknown,
  request?: Request,
  contextLabel?: string
): NextResponse {
  const correlationId = getCorrelationId(request);
  const isDev = process.env.NODE_ENV === 'development';

  const errObj = error instanceof Error ? error : new Error(String(error));
  const message = errObj.message || 'Internal Server Error';
  const status = (error as any)?.status && typeof (error as any).status === 'number' && (error as any).status >= 400 && (error as any).status < 600
    ? (error as any).status
    : 500;

  const url = request?.url ? new URL(request.url).pathname : 'unknown_path';
  const method = request?.method || 'UNKNOWN';

  // Structured observability log
  console.error(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: status >= 500 ? 'ERROR' : 'WARN',
      correlationId,
      context: contextLabel || 'api',
      route: `${method} ${url}`,
      status,
      message,
      stack: isDev ? errObj.stack : undefined,
    })
  );

  const responseBody: StandardApiErrorBody = {
    success: false,
    error: status >= 500 ? 'Internal Server Error' : message,
    code: (error as any)?.code || (status >= 500 ? 'INTERNAL_SERVER_ERROR' : 'API_ERROR'),
    correlationId,
    ...(isDev && status >= 500 ? { debugMessage: message } : {}),
  };

  return NextResponse.json(responseBody, {
    status,
    headers: {
      'x-correlation-id': correlationId,
    },
  });
}

/**
 * Higher-order Route Handler wrapper ensuring all uncaught exceptions
 * return standardized 5xx JSON with correlation IDs and prevent unhandled promise rejections.
 */
export function withApiErrorBoundary<T = any>(
  handler: (request: Request, ...args: any[]) => Promise<Response | NextResponse<T>>,
  contextLabel?: string
) {
  return async (request: Request, ...args: any[]): Promise<Response> => {
    const correlationId = getCorrelationId(request);
    try {
      const response = await handler(request, ...args);
      // Ensure the response always carries the correlation ID header for traceability
      if (response && response.headers && !response.headers.has('x-correlation-id')) {
        response.headers.set('x-correlation-id', correlationId);
      }
      return response;
    } catch (unhandledError: unknown) {
      return handleApiError(unhandledError, request, contextLabel);
    }
  };
}
