import { headers } from 'next/headers';
import Link from 'next/link';
import { ShieldX } from 'lucide-react';
import { adminDb } from '@/lib/supabase/admin';
import { verifyNoc } from '@/lib/club/ledger/noc.service';
import { NocCertificate } from '@/components/club/noc/NocCertificate';
import { DISPLAY } from '@/components/vibers/vibers-fonts';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Certificate · Vibers Club' };

/** Public verification of a No Objection Certificate: anyone holding the QR can check it here. */
export default async function NocPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  let result: Awaited<ReturnType<typeof verifyNoc>> = { valid: false, payload: null };
  try {
    result = await verifyNoc(adminDb(), String(code || '').toLowerCase());
  } catch {
    // Not set up yet, or unreachable: shown as not verified.
  }
  const h = await headers();
  const host = h.get('x-forwarded-host') || h.get('host') || 'localhost:3000';
  const proto = h.get('x-forwarded-proto') || (host.startsWith('localhost') ? 'http' : 'https');

  return (
    <main className="px-4 py-12 sm:px-6">
      {result.valid && result.payload ? (
        <NocCertificate noc={result.payload} verifyUrl={`${proto}://${host}/club/noc/${result.payload.code}`} />
      ) : (
        <div className="mx-auto max-w-md rounded-3xl border border-rose-200 bg-white p-8 text-center">
          <ShieldX aria-hidden="true" className="mx-auto h-8 w-8 text-rose-600" />
          <h1 className={`${DISPLAY} mt-3 text-2xl`}>Not a valid certificate</h1>
          <p className="mt-2 text-sm text-[#2a1250]/65">This code does not match a Vibers Club certificate, or the certificate was altered.</p>
          <Link href="/join" className="mt-5 inline-block text-sm font-semibold underline">Vibers Club</Link>
        </div>
      )}
    </main>
  );
}
