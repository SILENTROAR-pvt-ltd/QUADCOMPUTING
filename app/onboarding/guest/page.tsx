import Link from 'next/link';

export default function GuestOnboardingPage() {
  return (
    <main className="light-shell flex min-h-screen flex-col items-center justify-center bg-white p-4 text-center text-black">
      <div className="max-w-xl">
        <p className="mb-5 text-[10px] uppercase tracking-[0.3em] text-zinc-500">
          Quad Computing
        </p>
        <h1 className="font-serif text-3xl font-normal text-white md:text-4xl">
          Guest Access Portal
        </h1>
        <p className="mt-6 text-sm leading-7 text-zinc-400">
          Scan the Quad QR code on your table at any partnered cafe or hotel to
          unlock digital ordering, instant kitchen routing, and your global
          wallet.
        </p>
        <Link
          className="mt-10 inline-flex h-11 items-center justify-center border border-white/20 px-6 text-[10px] uppercase tracking-[0.2em] text-white transition-colors hover:border-white/50 hover:bg-zinc-900"
          href="/"
        >
          Return to Main Portal
        </Link>
      </div>
    </main>
  );
}
