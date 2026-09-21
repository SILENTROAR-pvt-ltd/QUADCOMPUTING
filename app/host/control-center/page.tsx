'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useHostWorkspace } from '@/lib/store/host-workspace.store';
import { DrawerHost } from '@/components/host/DrawerHost';

import { DashboardWorkspace } from '@/components/host/workspaces/DashboardWorkspace';
import { ProfileWorkspace } from '@/components/host/workspaces/ProfileWorkspace';
import { CatalogWorkspace } from '@/components/host/workspaces/CatalogWorkspace';
import { InventoryWorkspace } from '@/components/host/workspaces/InventoryWorkspace';
import { BillingWorkspace } from '@/components/host/workspaces/BillingWorkspace';

type Tab = 'dashboard' | 'profile' | 'catalog' | 'inventory' | 'billing';

export default function HostControlCenterAppShell() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const profile = useHostWorkspace((state) => state.profile);
  const clearWorkspace = useHostWorkspace((state) => state.clearWorkspace);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    clearWorkspace();
    router.push('/auth/host');
  }

  function handleTabChange(tab: Tab) {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  }

  if (!profile) return null; // Hydration layout protects this

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white font-sans text-zinc-900 selection:bg-black selection:text-white">
      
      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden" 
          onClick={() => setMobileMenuOpen(false)} 
        />
      )}

      {/* Persistent Left Sidebar — hidden on mobile, slide-in via toggle */}
      <aside className={`fixed inset-y-0 left-0 z-50 flex h-full w-[260px] shrink-0 flex-col overflow-hidden border-r border-zinc-800 bg-zinc-950 text-white transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-16 items-center justify-between px-6">
          <p className="text-[15px] font-semibold tracking-tight text-white">Quad Admin</p>
          <button onClick={() => setMobileMenuOpen(false)} className="rounded-lg p-1 text-zinc-500 hover:text-white lg:hidden">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>
        
        <div className="px-6 pb-5">
          <span className="inline-flex rounded-md border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-[9px] font-medium tracking-wider text-zinc-500">
            {profile.uniqueOwnerCafeId}
          </span>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
          <TabButton id="dashboard" active={activeTab} setActive={handleTabChange} label="Dashboard Overview" />
          <TabButton id="profile" active={activeTab} setActive={handleTabChange} label="My Profile & Settings" />
          <TabButton id="catalog" active={activeTab} setActive={handleTabChange} label="Services & Catalog" />
          <TabButton id="inventory" active={activeTab} setActive={handleTabChange} label="Inventory Management" />
          <TabButton id="billing" active={activeTab} setActive={handleTabChange} label="Billing & POS Ecosystem" />
        </nav>

        <div className="p-3 border-t border-white/5">
          <button
            onClick={handleSignOut}
            className="flex w-full items-center justify-center rounded-lg px-4 py-3 text-[11px] font-medium tracking-wide text-zinc-600 transition-colors hover:bg-white/5 hover:text-zinc-400"
          >
            Secure Sign Out
          </button>
        </div>
      </aside>

      {/* Main Workspace Area */}
      <main className="flex h-full flex-1 flex-col overflow-y-auto bg-zinc-50">
        
        {/* Mobile Top Bar */}
        <div className="sticky top-0 z-30 flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 lg:hidden">
          <button onClick={() => setMobileMenuOpen(true)} className="rounded-lg border border-zinc-200 p-2 text-zinc-700 transition-colors hover:bg-zinc-50">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="18" x2="20" y2="18"/></svg>
          </button>
          <p className="text-[13px] font-semibold tracking-tight text-black">Quad Admin</p>
          <div className="w-9" /> {/* Spacer for centering */}
        </div>

        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 md:px-8 lg:px-12 lg:py-16">
          {activeTab === 'dashboard' && <DashboardWorkspace />}
          {activeTab === 'profile' && <ProfileWorkspace />}
          {activeTab === 'catalog' && <CatalogWorkspace />}
          {activeTab === 'inventory' && <InventoryWorkspace />}
          {activeTab === 'billing' && <BillingWorkspace />}
        </div>
      </main>

      {/* Global Drawers */}
      <DrawerHost />
    </div>
  );
}

function TabButton({ id, active, setActive, label }: { id: Tab, active: Tab, setActive: (t: Tab) => void, label: string }) {
  const isActive = active === id;
  return (
    <button
      onClick={() => setActive(id)}
      className={`flex w-full items-center rounded-lg px-4 py-2.5 text-left text-[12px] font-medium tracking-normal transition-all ${
        isActive 
          ? 'bg-white text-black shadow-sm' 
          : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-300'
      }`}
    >
      {label}
    </button>
  );
}
