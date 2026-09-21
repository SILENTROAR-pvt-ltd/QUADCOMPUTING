'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useHostWorkspace } from '@/lib/store/host-workspace.store';

type AuthMode = 'login' | 'signup';

const inputClass = 'w-full border border-zinc-300 bg-white px-4 py-3 text-sm text-black placeholder:text-zinc-400 outline-none transition focus:border-black focus:ring-1 focus:ring-black/20';

export default function HostAuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const result = mode === 'signup'
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });

      if (result.error) throw result.error;
      if (!result.data.session) {
        throw new Error('No active host session was created. Confirm email verification is disabled in Supabase.');
      }

      // Check if profile exists for hydration
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', result.data.session.user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
      }

      if (!profile) {
        // First-time user, route to onboarding
        router.push('/onboarding/host');
        router.refresh();
        return;
      }

      // Profile exists; hydrate returning user's data
      const { data: businesses } = await supabase
        .from('businesses')
        .select('id')
        .eq('host_id', profile.id);

      const businessIds = businesses?.map((b) => b.id) || [];
      
      let locations: any[] = [];
      if (businessIds.length > 0) {
        const { data: fetchedLocations } = await supabase
          .from('locations')
          .select('*')
          .in('business_id', businessIds);
        locations = fetchedLocations || [];
      }

      // Map to Canonical State Type
      const propertyBranches = locations.map((loc) => ({
        id: loc.id as any,
        name: loc.branch_name,
        category: 'cafe' as any,
        gstNumber: null,
        bankName: null,
        bankAccountNumber: null,
        bankIfscCode: null,
        upiId: null,
        address: {
          line1: loc.address,
          line2: null,
          locality: loc.city,
          city: loc.city,
          state: loc.state,
          postalCode: loc.pincode || '',
          country: 'IN' as const,
        },
        geo: null,
        qrCodeHash: loc.qr_code_hash as any,
        status: 'live' as any,
        createdAt: loc.created_at,
        updatedAt: loc.created_at,
      }));

      // Hydrate Zustand Workspace 
      useHostWorkspace.getState().adoptSnapshot({
        profile: {
          uniqueOwnerCafeId: profile.owner_cafe_id as any,
          displayName: profile.full_name,
          legalEntityName: profile.full_name,
          avatarUrl: null,
          bannerUrl: null,
          contact: { email: email, phone: null },
          ecosystemStatement: profile.ecosystem_statement || '',
          categoriesHandled: profile.categories_handled || [],
          createdAt: profile.created_at,
          updatedAt: profile.created_at,
        },
        propertyBranches,
        serviceCatalog: [], 
        revision: profile.revision || 0,
      });

      router.push('/host/control-center');
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Authentication failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const isSignup = mode === 'signup';

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-4 py-10 text-white selection:bg-white selection:text-black">
      <section className="w-full max-w-md border border-white/15 bg-zinc-950 p-7 md:p-10">
        <header className="border-b border-white/10 pb-7">
          <Link className="font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-500 hover:text-white" href="/">
            Quad Computing
          </Link>
          <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-500">
            Host Authentication
          </p>
          <h1 className="mt-3 font-serif text-3xl font-light text-white">
            {isSignup ? 'Create Host Access' : 'Return to Host Access'}
          </h1>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            Authenticate before entering the Host Control Center onboarding pipeline.
          </p>
        </header>

        <div className="mt-7 grid grid-cols-2 border border-white/10 p-1">
          {(['signup', 'login'] as AuthMode[]).map((authMode) => (
            <button
              className={`py-3 text-[10px] uppercase tracking-[0.2em] transition ${mode === authMode ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'}`}
              key={authMode}
              onClick={() => { setMode(authMode); setErrorMessage(''); }}
              type="button"
            >
              {authMode === 'signup' ? 'New Host' : 'Host Login'}
            </button>
          ))}
        </div>

        <form className="mt-7 space-y-5" onSubmit={submit}>
          <label className="block">
            <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">Email Address</span>
            <input className={inputClass} autoComplete="email" required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="host@example.com" />
          </label>
          <label className="block">
            <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">Password</span>
            <input className={inputClass} autoComplete={isSignup ? 'new-password' : 'current-password'} minLength={6} required type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Minimum 6 characters" />
          </label>
          {errorMessage && <p className="border border-zinc-700 px-4 py-3 text-sm leading-6 text-zinc-300">{errorMessage}</p>}
          <button className="flex h-12 w-full items-center justify-center bg-white px-5 text-[10px] uppercase tracking-[0.2em] text-black transition hover:bg-zinc-300 disabled:cursor-not-allowed disabled:bg-zinc-600" disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Authenticating...' : isSignup ? 'Create Host Access' : 'Enter Host Control Center'}
          </button>
        </form>

        <p className="mt-7 text-center text-xs text-zinc-500">
          Authentication creates the session required for Registered Profile Infrastructure provisioning.
        </p>
      </section>
    </main>
  );
}
