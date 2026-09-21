import Link from 'next/link';

export default function RootPortal() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-4 text-center selection:bg-white selection:text-black">
      {/* Background Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 h-full w-full object-cover"
      >
        <source src="/videos/305391.mp4" type="video/mp4" />
      </video>
      
      {/* Overlay to ensure text readability */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Foreground Content */}
      <div className="relative z-10 flex w-full max-w-3xl flex-col items-center">
        <p className="mb-5 text-[10px] font-medium uppercase tracking-[0.3em] text-zinc-400">
          Quad Computing
        </p>
        <h1 className="hero-brand max-w-[min(92vw,58rem)] text-5xl font-light not-italic leading-[0.98] tracking-[0.045em] text-white md:text-6xl">
          Quad Computing Ecosystem
        </h1>
        <p className="mt-6 text-sm font-light uppercase tracking-[0.2em] text-zinc-300">
          Flawless solutions for your business
        </p>

        <div className="mt-10 flex w-full max-w-sm flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            className="flex h-11 w-full items-center justify-center whitespace-nowrap border border-white/20 bg-black/50 px-5 text-center text-[10px] font-medium uppercase leading-none tracking-[0.2em] text-white backdrop-blur-sm transition-colors hover:border-white hover:bg-white/10 sm:min-w-[9rem] sm:w-auto"
            href="/onboarding/guest"
          >
            Guest Access
          </Link>
          <Link
            className="flex h-11 w-full items-center justify-center whitespace-nowrap bg-white px-5 text-center text-[10px] font-medium uppercase leading-none tracking-[0.2em] text-black transition-colors hover:bg-zinc-300 sm:min-w-[12rem] sm:w-auto"
            href="/auth/host"
          >
            Create Host Profile
          </Link>
        </div>
      </div>
    </main>
  );
}
