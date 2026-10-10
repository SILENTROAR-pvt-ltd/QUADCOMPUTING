import Link from 'next/link';

export default function RootPortal() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-4 text-center text-black selection:bg-black selection:text-white">
      <div className="flex w-full max-w-3xl flex-col items-center">
        <p className="mb-5 text-[10px] font-medium uppercase tracking-[0.3em] text-zinc-500">
          Quad Computing
        </p>
        <h1 className="hero-brand max-w-[min(92vw,58rem)] text-5xl font-light not-italic leading-[0.98] tracking-[0.045em] text-black md:text-6xl">
          Quad Computing Ecosystem
        </h1>
        <p className="mt-6 text-sm font-light uppercase tracking-[0.2em] text-zinc-500">
          Flawless solutions for your business
        </p>

        <div className="mt-10 flex w-full max-w-sm flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            className="flex h-11 w-full items-center justify-center whitespace-nowrap border border-zinc-300 bg-white px-5 text-center text-[10px] font-medium uppercase leading-none tracking-[0.2em] text-black transition-colors hover:border-black hover:bg-zinc-100 sm:min-w-[9rem] sm:w-auto"
            href="/onboarding/guest"
          >
            Guest Access
          </Link>
          <Link
            className="flex h-11 w-full items-center justify-center whitespace-nowrap bg-black px-5 text-center text-[10px] font-medium uppercase leading-none tracking-[0.2em] text-white transition-colors hover:bg-zinc-800 sm:min-w-[12rem] sm:w-auto"
            href="/onboarding/host"
          >
            Create Host Profile
          </Link>
        </div>
      </div>
    </main>
  );
}
