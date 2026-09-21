'use client';

import { useHostWorkspace, useCompletionStatus } from '@/lib/store/host-workspace.store';

export function DashboardWorkspace() {
  const profile = useHostWorkspace((state) => state.profile);
  const propertyBranches = useHostWorkspace((state) => state.propertyBranches);
  const serviceCatalog = useHostWorkspace((state) => state.serviceCatalog);
  
  const { score: completionScore } = useCompletionStatus();
  
  if (!profile) return null;

  const activeItems = serviceCatalog.filter(i => i.status !== 'archived').length;
  const walletBalance = 0; // Mocked for now, this would come from a wallet table

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-10">
        <h2 className="font-serif text-2xl sm:text-3xl font-medium tracking-tight text-zinc-900">Dashboard Overview</h2>
        <p className="mt-2 text-sm text-zinc-500">A high-level summary of your Quad Ecosystem.</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Metric Cards */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Active Catalog</p>
          <p className="mt-3 font-serif text-4xl text-black">{activeItems}</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Registered Facilities</p>
          <p className="mt-3 font-serif text-4xl text-black">{propertyBranches.length}</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Profile Integrity</p>
          <p className="mt-3 font-serif text-4xl text-black">{completionScore}%</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-zinc-950 p-6 text-white shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Global Wallet</p>
          <p className="mt-3 font-serif text-4xl">₹{walletBalance.toFixed(2)}</p>
        </div>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        {/* Active Verticals */}
        <section className="rounded-2xl border border-zinc-200 bg-zinc-50 p-8">
          <h3 className="font-serif text-xl font-medium text-zinc-900">Active Verticals</h3>
          <div className="mt-6 flex flex-wrap gap-2">
            {profile.categoriesHandled.map((cat) => (
              <span key={cat} className="rounded-xl bg-white px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-black shadow-sm ring-1 ring-zinc-200">
                {cat.replace('_', ' ')}
              </span>
            ))}
            {profile.categoriesHandled.length === 0 && (
              <span className="text-sm text-zinc-400">No verticals selected</span>
            )}
          </div>
        </section>

        {/* Flagship Locations */}
        <section className="rounded-2xl border border-zinc-200 bg-zinc-50 p-8">
          <h3 className="font-serif text-xl font-medium text-zinc-900">Registered Facilities</h3>
          <div className="mt-6 space-y-4">
            {propertyBranches.map(branch => (
              <div key={branch.id} className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm ring-1 ring-zinc-200">
                <div>
                  <p className="font-medium text-black">{branch.name}</p>
                  <p className="text-xs text-zinc-500">{branch.address.city}, {branch.address.state}</p>
                </div>
                <span className="rounded-full bg-zinc-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  {branch.status}
                </span>
              </div>
            ))}
            {propertyBranches.length === 0 && (
              <p className="text-sm text-zinc-400">No facilities registered.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
