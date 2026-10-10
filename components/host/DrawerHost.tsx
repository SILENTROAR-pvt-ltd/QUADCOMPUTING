'use client';

import { useDrawer } from '@/lib/store/drawer.store';

export function DrawerHost() {
  const intent = useDrawer((state) => state.intent);
  const close = useDrawer((state) => state.close);
  if (!intent) return null;
  return <div className="fixed inset-0 z-50 flex justify-end bg-black/70" onClick={close}><aside className="h-full w-full max-w-xl bg-white p-8 text-black" onClick={(event) => event.stopPropagation()}><p className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">Slide-Over Drawer</p><h2 className="mt-3 font-serif text-3xl font-light">{intent.kind.replace('-', ' ')}</h2><button className="mt-8 border border-black px-5 py-3 text-xs uppercase tracking-widest" onClick={close} type="button">Close</button></aside></div>;
}
