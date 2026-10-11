'use client';

import { useEffect, useState } from 'react';

export interface GstUiStatus { loaded: boolean; canCharge: boolean; reason: string | null }

/** Whether this venue may charge GST. The server enforces the same rule on every bill. */
export function useGstStatus(): GstUiStatus {
  const [status, setStatus] = useState<GstUiStatus>({ loaded: false, canCharge: false, reason: null });
  useEffect(() => {
    let alive = true;
    fetch('/api/host/gst-status', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => { if (alive) setStatus({ loaded: true, canCharge: Boolean(d?.canCharge), reason: d?.reason ?? null }); })
      .catch(() => { if (alive) setStatus({ loaded: true, canCharge: false, reason: 'Could not check your GST setup. GST is off for now.' }); });
    return () => { alive = false; };
  }, []);
  return status;
}
