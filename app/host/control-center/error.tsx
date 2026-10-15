'use client';

import { useEffect } from 'react';
import { isChunkLoadError, reloadOnceForChunkError } from '@/lib/utils/chunk-error';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const stale = isChunkLoadError(error);
  // A page left open across a new deploy: load the new version once instead of showing an error.
  useEffect(() => {
    if (stale) reloadOnceForChunkError();
  }, [stale]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6 text-black">
      <div className="max-w-md">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">{stale ? 'Updated' : 'Control Center unavailable'}</p>
        <h1 className="mt-3 font-serif text-3xl">{stale ? 'Reload to continue' : 'Unable to load workspace'}</h1>
        {stale && <p className="mt-3 text-sm text-zinc-600">Quad Computing was updated while this page was open. Your orders, bills and tables are safe.</p>}
        <button className="mt-6 border border-black px-5 py-3 text-xs uppercase tracking-widest" onClick={stale ? () => window.location.reload() : reset}>
          {stale ? 'Reload page' : 'Retry'}
        </button>
      </div>
    </main>
  );
}