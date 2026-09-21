'use client';

import { useHostWorkspace, useCompletionStatus } from '@/lib/store/host-workspace.store';
import { LEXICON } from '@/lib/lexicon';
import ProfileHeader from '@/components/host/ProfileHeader';
import PropertyBranches from '@/components/host/PropertyBranches';
import ServiceCatalog from '@/components/host/ServiceCatalog';
import { useDrawer } from '@/lib/store/drawer.store';

export default function ControlCenterWorkspace() {
  const hydrated = useHostWorkspace((state) => state.hydrated);
  const profile = useHostWorkspace((state) => state.profile);
  const branches = useHostWorkspace((state) => state.propertyBranches);
  const catalog = useHostWorkspace((state) => state.serviceCatalog);
  const openDrawer = useDrawer((state) => state.open);
  const completion = useCompletionStatus();

  if (!hydrated) return <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">Syncing...</p>;

  if (!profile) {
    return <section className="mt-10 border border-zinc-200 bg-white p-8 text-black"><p className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">{LEXICON.profile}</p><h2 className="mt-3 font-serif text-3xl font-light">Workspace not provisioned</h2><p className="mt-3 text-sm text-zinc-500">Complete host onboarding to create the Registered Profile Infrastructure.</p></section>;
  }

  return <div className="mt-10 space-y-10">
    <ProfileHeader profile={profile} completionScore={completion.score} onOpenEditDrawer={() => openDrawer({ kind: 'edit-profile' })} />
    <PropertyBranches businesses={branches} />
    <ServiceCatalog items={catalog} onAddFood={() => branches[0] && openDrawer({ kind: 'add-food', branchId: branches[0].id })} onAddRoom={() => branches[0] && openDrawer({ kind: 'add-room', branchId: branches[0].id })} />
    <section className="border-t border-zinc-200 pt-6 text-black"><p className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">{LEXICON.completion}</p><p className="mt-2 text-sm text-zinc-600">{completion.tier}{completion.nextAction ? ` / Next: ${completion.nextAction.hint}` : ''}</p></section>
  </div>;
}
