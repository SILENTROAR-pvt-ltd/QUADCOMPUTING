import { describe, it, expect } from 'vitest';
import {
  generateCorrelationId,
  getCorrelationId,
  handleApiError,
  withApiErrorBoundary,
} from './error-handler';
import { NextResponse } from 'next/server';

describe('PHASE 2D: Centralized Error Boundary & Correlation IDs', () => {
  it('generates correlation IDs with unique prefix format', () => {
    const id1 = generateCorrelationId();
    const id2 = generateCorrelationId();
    expect(id1).toMatch(/^cid_[a-z0-9]+_[a-z0-9]+$/);
    expect(id2).toMatch(/^cid_[a-z0-9]+_[a-z0-9]+$/);
    expect(id1).not.toBe(id2);
  });

  it('preserves incoming x-correlation-id header when provided', () => {
    const incomingId = 'client-trace-abc-123';
    const req = new Request('http://localhost/api/test', {
      headers: { 'x-correlation-id': incomingId },
    });
    expect(getCorrelationId(req)).toBe(incomingId);
  });

  it('handleApiError returns standardized 500 JSON with correlation ID header and body', async () => {
    const req = new Request('http://localhost/api/test/fail');
    const err = new Error('Database connection failed unexpectedly');
    const res = handleApiError(err, req, 'UnitTest');

    expect(res.status).toBe(500);
    expect(res.headers.get('x-correlation-id')).toBeTruthy();

    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toBe('Internal Server Error');
    expect(data.code).toBe('INTERNAL_SERVER_ERROR');
    expect(data.correlationId).toBe(res.headers.get('x-correlation-id'));
  });

  it('withApiErrorBoundary intercepts unhandled errors and returns standardized 5xx JSON', async () => {
    const faultyHandler = async () => {
      throw new Error('Fatal crash in async operation');
    };

    const wrappedHandler = withApiErrorBoundary(faultyHandler, 'TestRoute');
    const req = new Request('http://localhost/api/test/crash');
    const res = await wrappedHandler(req);

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toBe('Internal Server Error');
    expect(data.correlationId).toBeTruthy();
    expect(res.headers.get('x-correlation-id')).toBe(data.correlationId);
  });

  it('withApiErrorBoundary passes through successful responses and attaches x-correlation-id', async () => {
    const okHandler = async () => {
      return NextResponse.json({ success: true, count: 42 });
    };

    const wrappedHandler = withApiErrorBoundary(okHandler, 'OkRoute');
    const req = new Request('http://localhost/api/test/ok');
    const res = await wrappedHandler(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('x-correlation-id')).toBeTruthy();
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.count).toBe(42);
  });
});
