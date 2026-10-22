import { beforeEach, describe, expect, it, vi } from 'vitest';

const channels: any[] = [];
const removed: any[] = [];

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    channel: (topic: string) => {
      const ch: any = { topic, handler: null as null | ((m?: any) => void), onStatus: null as null | ((s: string) => void) };
      ch.on = (_type: string, _filter: any, cb: (m?: any) => void) => { ch.handler = cb; return ch; };
      ch.subscribe = (cb: (s: string) => void) => { ch.onStatus = cb; return ch; };
      channels.push(ch);
      return ch;
    },
    removeChannel: (ch: any) => removed.push(ch),
  }),
}));

import { floorTopic, subscribeFloor, ticketStageOf } from './floor-ping';

const BIZ = '189664b2-99e7-4d45-ac50-ffb647ef97df';
const TICKET = '7b0c6a5e-1111-4222-8333-444444444444';

beforeEach(() => { channels.length = 0; removed.length = 0; });

describe('floor ping', () => {
  it('names a topic only for a real venue id', () => {
    expect(floorTopic(BIZ.toUpperCase())).toBe(`floor_${BIZ}`);
    expect(floorTopic('nope')).toBeNull();
    expect(floorTopic(null)).toBeNull();
    expect(subscribeFloor('nope', { ping: () => {}, status: () => {} })).toBeTypeOf('function');
    expect(channels).toHaveLength(0);
  });

  it('shares one channel between a venue\'s listeners and closes it with the last', () => {
    const a = { ping: vi.fn(), status: vi.fn() };
    const b = { ping: vi.fn(), status: vi.fn() };
    const offA = subscribeFloor(BIZ, a);
    const offB = subscribeFloor(BIZ, b);
    expect(channels).toHaveLength(1);

    channels[0].onStatus('SUBSCRIBED');
    expect(a.status).toHaveBeenLastCalledWith(true);
    expect(b.status).toHaveBeenLastCalledWith(true);

    channels[0].handler();
    expect(a.ping).toHaveBeenCalledTimes(1);
    expect(b.ping).toHaveBeenCalledTimes(1);

    offA();
    expect(removed).toHaveLength(0);
    channels[0].handler();
    expect(a.ping).toHaveBeenCalledTimes(1);
    expect(b.ping).toHaveBeenCalledTimes(2);

    offB();
    expect(removed).toEqual([channels[0]]);
  });

  it('reports a dropped channel so screens fall back to reading often', () => {
    const l = { ping: vi.fn(), status: vi.fn() };
    const off = subscribeFloor(BIZ, l);
    channels[0].onStatus('SUBSCRIBED');
    channels[0].onStatus('CHANNEL_ERROR');
    expect(l.status).toHaveBeenLastCalledWith(false);
    off();
  });

  it('hands listeners the ticket stage a ping names, and nothing for an empty ping', () => {
    const l = { ping: vi.fn(), status: vi.fn() };
    const off = subscribeFloor(BIZ, l);
    channels[0].handler({ event: 'changed', payload: { k: TICKET, s: 'READY' } });
    channels[0].handler({ event: 'changed', payload: {} });
    expect(l.ping.mock.calls).toEqual([[{ id: TICKET, status: 'READY' }], [null]]);
    off();
  });
});

describe('the floor ping message', () => {
  it('reads a ticket stage the database names, as realtime delivers it', () => {
    expect(ticketStageOf({ event: 'changed', payload: { k: TICKET, s: 'READY' } })).toEqual({ id: TICKET, status: 'READY' });
    expect(ticketStageOf({ payload: { k: TICKET, s: 'served' } })).toEqual({ id: TICKET, status: 'SERVED' });
  });

  it('treats the usual empty ping, and anything malformed, as no stage', () => {
    expect(ticketStageOf({ event: 'changed', payload: {} })).toBeNull();
    expect(ticketStageOf(undefined)).toBeNull();
    expect(ticketStageOf({ payload: { k: 'not-a-uuid', s: 'READY' } })).toBeNull();
    expect(ticketStageOf({ payload: { k: TICKET, s: 'EATEN' } })).toBeNull();
    expect(ticketStageOf({ payload: { k: TICKET } })).toBeNull();
  });
});
