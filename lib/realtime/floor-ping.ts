// Client side of the "floor ping": a "something changed at this venue" signal that a database trigger broadcasts (see
// migrations 20261016000004 and 20261022000003). A staff phone signed in by PIN has no database login, so it cannot listen
// to row changes; it listens to this instead and re-reads through its own authenticated calls. The message is empty,
// except that a kitchen ticket changing stage names the ticket id and the stage (no table, dish, amount or person), so a
// waiter's phone can move that card at once.
import { createClient } from '@/lib/supabase/client';
import { isUuid } from './channels';

/** A ticket that changed stage, as the ping names it. */
export interface TicketStage { id: string; status: string }

export interface FloorListener {
  ping: (ticket: TicketStage | null) => void;
  status: (connected: boolean) => void;
}

interface Shared {
  supabase: any;
  channel: any;
  listeners: Set<FloorListener>;
  connected: boolean;
}

const shared = new Map<string, Shared>();
const STAGES = new Set(['PENDING', 'PREPARING', 'READY', 'SERVED', 'CANCELLED']);

export const floorTopic = (businessId?: string | null): string | null =>
  isUuid(businessId) ? `floor_${businessId.toLowerCase()}` : null;

/** The ticket stage a ping carries, or null for the usual empty ping. Anything malformed is ignored. */
export function ticketStageOf(message: any): TicketStage | null {
  const p = message?.payload ?? message;
  const id = p?.k, status = typeof p?.s === 'string' ? p.s.toUpperCase() : '';
  return isUuid(id) && STAGES.has(status) ? { id, status } : null;
}

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
      .on('broadcast', { event: 'changed' }, (message: any) => {
        const ticket = ticketStageOf(message);
        created.listeners.forEach((l) => l.ping(ticket));
      })
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
