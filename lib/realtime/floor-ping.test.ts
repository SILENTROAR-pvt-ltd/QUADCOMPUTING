import { beforeEach, describe, expect, it, vi } from 'vitest';

const channels: any[] = [];
const removed: any[] = [];

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    channel: (topic: string) => {
      const ch: any = { topic, handler: null as null | (() => void), onStatus: null as null | ((s: string) => void) };
      ch.on = (_type: string, _filter: any, cb: () => void) => { ch.handler = cb; return ch; };
      ch.subscribe = (cb: (s: string) => void) => { ch.onStatus = cb; return ch; };
      channels.push(ch);
      return ch;
    },
    removeChannel: (ch: any) => removed.push(ch),
  }),
}));

import { floorTopic, subscribeFloor } from './floor-ping';

const BIZ = '189664b2-99e7-4d45-ac50-ffb647ef97df';

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
});
