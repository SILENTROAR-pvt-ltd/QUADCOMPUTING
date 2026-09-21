'use client';

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="flex min-h-screen items-center justify-center bg-white px-6 text-black"><div className="max-w-md"><p className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">Control Center unavailable</p><h1 className="mt-3 font-serif text-3xl">Unable to load workspace</h1><button className="mt-6 border border-black px-5 py-3 text-xs uppercase tracking-widest" onClick={reset}>Retry</button></div></main>;
}
