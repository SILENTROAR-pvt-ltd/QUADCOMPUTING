import { describe, expect, it } from 'vitest';
import { tableLockKey, withTableLock } from './table-lock';

const tick = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('one order at a time per table', () => {
  it('runs the same table in order, so the second sees the first', async () => {
    const log: string[] = [];
    await Promise.all(['a', 'b', 'c'].map((n, i) => withTableLock('v:T1', async () => {
      log.push(`start ${n}`);
      await tick(30 - i * 10);
      log.push(`end ${n}`);
    })));
    expect(log).toEqual(['start a', 'end a', 'start b', 'end b', 'start c', 'end c']);
  });

  it('lets different tables run together', async () => {
    const log: string[] = [];
    await Promise.all(['T1', 'T2'].map((t) => withTableLock(`v:${t}`, async () => {
      log.push(`start ${t}`);
      await tick(20);
      log.push(`end ${t}`);
    })));
    expect(log.slice(0, 2)).toEqual(['start T1', 'start T2']);
  });

  it('keeps going after a failure and returns each caller its own result', async () => {
    const first = withTableLock('v:T1', async () => { throw new Error('boom'); });
    const second = withTableLock('v:T1', async () => 'ok');
    await expect(first).rejects.toThrow('boom');
    await expect(second).resolves.toBe('ok');
  });

  it('names a table the same however the QR spells it', () => {
    expect(tableLockKey('v', 'T-02')).toBe(tableLockKey('v', 'Table 02'));
    expect(tableLockKey('v', 't-02')).toBe('v:02');
  });
});
