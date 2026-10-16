// Client side of the "floor ping": a content-free "something changed at this venue" signal that a database trigger
// broadcasts (see migration 20261016000004_floor_ping.sql). A staff phone signed in by PIN has no database login, so it
// cannot listen to row changes; it listens to this instead and re-reads through its own authenticated calls. The message
// carries no data, so the topic being public leaks nothing beyond "there was activity".
import { createClient } from '@/lib/supabase/client';
import { isUuid } from './channels';

export interface FloorListener {
  ping: () => void;
  status: (connected: boolean) => void;
}

interface Shared {
  supabase: any;
  channel: any;
  listeners: Set<FloorListener>;
  connected: boolean;
}

const shared = new Map<string, Shared>();

export const floorTopic = (businessId?: string | null): string | null =>
  isUuid(businessId) ? `floor_${businessId.toLowerCase()}` : null;

/**
 * Listens to one venue's floor pings. Every listener in the page shares a single channel, which closes with the last one.
 * Returns the unsubscribe function.
 */
export function subscribeFloor(businessId: string, listener: FloorListener): () => void {
  const topic = floorTopic(businessId);
  if (!topic) return () => {};

  let entry = shared.get(topic);
  if (!entry) {
    const supabase = createClient();
    const created: Shared = { supabase, channel: null, listeners: new Set(), connected: false };
    created.channel = supabase
      .channel(topic)
      .on('broadcast', { event: 'changed' }, () => created.listeners.forEach((l) => l.ping()))
      .subscribe((status: string) => {
        created.connected = status === 'SUBSCRIBED';
        created.listeners.forEach((l) => l.status(created.connected));
      });
    shared.set(topic, created);
    entry = created;
  }

  const current = entry;
  current.listeners.add(listener);
  listener.status(current.connected);

  return () => {
    current.listeners.delete(listener);
    if (current.listeners.size === 0) {
      shared.delete(topic);
      try { current.supabase.removeChannel(current.channel); } catch { /* already closed */ }
    }
  };
}
