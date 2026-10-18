import { describe, it, expect, vi } from 'vitest';
import { guestTableChannel, businessFilter, broadcastToGuestTable } from './channels';

const A = 'aaaaaaaa-1111-4222-8333-444444444444';
const B = 'bbbbbbbb-1111-4222-8333-444444444444';

describe('guestTableChannel', () => {
  it('scopes the same table number to different channels per venue', () => {
    expect(guestTableChannel(A, '1')).not.toBe(guestTableChannel(B, '1'));
  });

  it('normalizes table labels the way the session services do', () => {
    expect(guestTableChannel(A, 'Table T-01')).toBe(guestTableChannel(A, 't-01'));
    expect(guestTableChannel(A, 'T-01 (Window)')).toBe(`biz_${A}_table_01`);
  });

  it('refuses to build an unscoped channel', () => {
    expect(guestTableChannel('my-cafe-slug', '1')).toBeNull();
    expect(guestTableChannel(undefined, '1')).toBeNull();
    expect(guestTableChannel(A, '')).toBeNull();
  });
});

describe('businessFilter', () => {
  it('filters only on a real venue id', () => {
    expect(businessFilter(A)).toBe(`business_id=eq.${A}`);
    expect(businessFilter('x')).toBeUndefined();
  });
});

describe('broadcastToGuestTable', () => {
  const fakeClient = (httpSend: any) => {
    const channel = { httpSend };
    return { channel: vi.fn(() => channel), removeChannel: vi.fn(async () => 'ok'), _ch: channel };
  };

  it('sends over REST on the scoped topic and cleans up the channel', async () => {
    const sb = fakeClient(vi.fn(async () => ({ success: true })));
    const ok = await broadcastToGuestTable(sb, A, 'T-01', 'table_settled');
    expect(ok).toBe(true);
    expect(sb.channel).toHaveBeenCalledWith(`biz_${A}_table_01`);
    // The topic is public, so the message is always empty: no total, order id or fee.
    expect(sb._ch.httpSend).toHaveBeenCalledWith('table_settled', {});
    expect(sb.removeChannel).toHaveBeenCalledWith(sb._ch);
  });

  it('never throws and skips unscoped targets', async () => {
    const sb = fakeClient(vi.fn(async () => { throw new Error('network'); }));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(broadcastToGuestTable(sb, A, '1', 'kot_status_update')).resolves.toBe(false);
    expect(sb.removeChannel).toHaveBeenCalled();
    expect(await broadcastToGuestTable(sb, 'slug', '1', 'kot_status_update')).toBe(false);
  });
});
