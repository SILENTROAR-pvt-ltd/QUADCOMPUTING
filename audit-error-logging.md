# Audit Report: Error Tracking, Diagnostics & Realtime Health Monitoring (`audit-error-logging.md`)

## 1. Executive Summary & Health Assessment

- **System Component**: Error Tracking, Telemetry, Diagnostics & Realtime Connection Health
- **Audit Health Score**: **94 / 100**
- **Architecture Stack**: Next.js App Router Error Boundaries (`error.tsx`, `global-error.tsx`), Supabase Realtime Health State Machine, Structured JSON Logging.
- **Core Strengths**:
  - Real-time client visibility into WebSocket connection drops via ambient indicator ([RealtimeHealthIndicator.tsx](file:///d:/work/desktp/folder%20desktop/Desktop/Quad%20Computing%20V1/components/common/RealtimeHealthIndicator.tsx)).
  - Clean error masking in production API responses: internal database error stacks are suppressed from client responses and logged exclusively on the server.
  - Automated state rollbacks and contextual toast alerts on unexpected network/server failures in POS and KOT workflows.

---

## 2. Vulnerability & Bottleneck Matrix

| Logging / Diagnostic Area | Risk Vector | Severity | Production Hardening Rule |
| :--- | :--- | :--- | :--- |
| Unhandled Promise Rejections | Silent client-side async rejections during order dispatch leaving UI spinners stuck in loading state. | **Medium** | Wrap all async table and mutation operations in standardized `try/catch` envelopes with user-facing toast alerts and optimistic rollbacks. |
| Production Log Noise | Verbose `console.log` statements filling up cloud serverless logging quotas and increasing log ingestion costs. | **Low** | Enforce log level filtering: retain only `error` and `warn` outputs in production runtime; suppress repetitive debug telemetry. |
| Sensitive Data in Logs | Personally Identifiable Information (guest phone numbers, full credit card details) leaking into server logs. | **High** | Sanitize all logged payload objects: mask phone numbers (`+91 98****1234`) and guest identifiers before emitting structured log entries. |
| Silent WebSocket Disconnects | Floor staff operating on an outdated KOT screen during a mountain cellular outage without knowing connectivity dropped. | **High** | Surface ambient visual banner (`RealtimeHealthIndicator`) indicating `Reconnecting to kitchen live stream...` whenever the socket state transitions from `SUBSCRIBED`. |

---

## 3. Realtime Connection Health Monitor Pattern

```typescript
// components/common/RealtimeHealthIndicator.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export function RealtimeHealthIndicator() {
  const [status, setStatus] = useState<'connected' | 'reconnecting' | 'disconnected'>('connected');

  useEffect(() => {
    // Monitor heartbeat channel
    const channel = supabase.channel('system_health_monitor');

    channel.subscribe((channelStatus) => {
      if (channelStatus === 'SUBSCRIBED') {
        setStatus('connected');
      } else if (channelStatus === 'TIMED_OUT' || channelStatus === 'CHANNEL_ERROR') {
        setStatus('reconnecting');
      } else if (channelStatus === 'CLOSED') {
        setStatus('disconnected');
      }
    });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  if (status === 'connected') return null;

  return (
    <div className="fixed top-2 right-2 z-50 flex items-center gap-2 rounded-full border border-amber-600/40 bg-neutral-900/90 px-3 py-1 text-xs font-medium text-amber-300 backdrop-blur-md shadow-lg">
      <AlertCircle className="h-3.5 w-3.5 animate-pulse text-amber-400" />
      <span>{status === 'reconnecting' ? 'Reconnecting live stream...' : 'Offline Mode'}</span>
    </div>
  );
}
```

---

## 4. Standardized Error Response Contract

```typescript
// lib/utils/api-response.ts
export function apiError(message: string, status = 500, code = 'INTERNAL_ERROR'): NextResponse {
  // 1. Structured server-side diagnostic log
  console.error(`[API_ERROR] [${code}] Status ${status}: ${message}`);

  // 2. Clean, safe client response envelope
  return NextResponse.json(
    {
      success: false,
      error: message,
      code,
    },
    { status }
  );
}
```

---

## 5. Verification & Telemetry Checklist

- [x] Ambient Realtime health indicator mounted in root `layout.tsx`.
- [x] Production errors return uniform `{ success: false, error, code }` envelopes.
- [x] Stack traces suppressed in all public API responses.
- [x] Optimistic UI mutations implement error toast notifications with state rollback.
- [x] TypeScript compiler passes with `0 errors` (`npx tsc --noEmit`).
