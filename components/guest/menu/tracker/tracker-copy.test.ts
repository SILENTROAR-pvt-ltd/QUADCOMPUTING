import { describe, it, expect } from 'vitest';
import { chefClipFor, resolveTrackerStage, stageCopy, stageStep, stepCopy, TRACKER_MEDIA, type TrackerStage } from './tracker-copy';

// The step the tracker showed before this redesign, written out the way the old component computed it.
function legacyStep(kot: string, ord: string): number {
  const k = kot.toUpperCase();
  const o = ord.toUpperCase();
  const stage3 = ['READY', 'SERVED', 'COMPLETED', 'DELIVERED'].includes(k) || ['READY', 'SERVED', 'COMPLETED', 'DELIVERED'].includes(o);
  const stage2 = !stage3 && (['PREPARING', 'PROCESSING', 'STARTED', 'COOKING', 'IN_PROGRESS'].includes(k) || ['PREPARING', 'PROCESSING', 'COOKING'].includes(o));
  return stage3 ? 2 : stage2 ? 1 : 0;
}

describe('tracker stage', () => {
  const kots = ['PENDING', 'PLACED', 'OPEN', 'PREPARING', 'STARTED', 'COOKING', 'IN_PROGRESS', 'PROCESSING', 'READY', 'SERVED', 'COMPLETED', 'DELIVERED', 'CANCELLED', ''];
  const orders = ['PLACED', 'PENDING', 'PREPARING', 'PROCESSING', 'COOKING', 'READY', 'SERVED', 'COMPLETED', 'DELIVERED', 'OPEN', ''];

  it('puts every status on the same step the tracker always used', () => {
    for (const k of kots) for (const o of orders) {
      expect(stageStep(resolveTrackerStage(k, o)), `${k} / ${o}`).toBe(legacyStep(k, o));
    }
  });

  it('reads status in any letter case', () => {
    expect(resolveTrackerStage('preparing', 'placed')).toBe('preparing');
    expect(resolveTrackerStage('ready', '')).toBe('ready');
    expect(resolveTrackerStage('served', '')).toBe('served');
  });

  it('tells a ready dish from a served one, and anything unknown is simply received', () => {
    expect(resolveTrackerStage('READY', 'PLACED')).toBe('ready');
    expect(resolveTrackerStage('SERVED', 'PLACED')).toBe('served');
    expect(resolveTrackerStage('COMPLETED', '')).toBe('served');
    expect(resolveTrackerStage('SOMETHING_NEW', 'ALSO_NEW')).toBe('received');
  });
});

describe('chef clip', () => {
  it('shows the cooking chef until the order is ready, then the happy one', () => {
    expect(chefClipFor('received')).toBe('preparing');
    expect(chefClipFor('preparing')).toBe('preparing');
    expect(chefClipFor('ready')).toBe('ready');
    expect(chefClipFor('served')).toBe('ready');
  });
});

describe('hospitality wording', () => {
  const stages: TrackerStage[] = ['received', 'preparing', 'ready', 'served'];

  it('every stage has a headline, a detail and three gentle lines', () => {
    for (const stage of stages) {
      const c = stageCopy(stage, 'T-04');
      expect(c.headline.length).toBeGreaterThan(8);
      expect(c.detail.length).toBeGreaterThan(8);
      expect(c.eyebrow.length).toBeGreaterThan(2);
      expect(c.whispers).toHaveLength(3);
      for (const w of c.whispers) expect(w.trim().length).toBeGreaterThan(8);
    }
  });

  it('names the table, or says "your table" when there is none', () => {
    expect(stageCopy('received', 'T-04').detail).toContain('Table T-04');
    expect(stageCopy('received', 'Table').detail).toContain('your table');
    expect(stageCopy('ready', '').detail).toContain('your table');
  });

  it('makes no promise a kitchen cannot keep: no countdowns, no minutes', () => {
    for (const stage of stages) {
      const c = stageCopy(stage, 'T-04');
      const all = [c.headline, c.detail, ...c.whispers].join(' ');
      expect(all).not.toMatch(/\d+\s*(min|minute|hour)/i);
    }
  });

  it('the three steps read as received, prepared, ready (served once it is)', () => {
    expect(stepCopy('preparing').map((s) => s.title)).toEqual(['Received', 'Being prepared', 'Ready for you']);
    expect(stepCopy('served')[2].title).toBe('Served');
  });
});

describe('media paths', () => {
  it('are versioned files under /media/tracker', () => {
    for (const m of Object.values(TRACKER_MEDIA)) {
      expect(m.src).toMatch(/^\/media\/tracker\/[a-z-]+-v\d+\.mp4$/);
      expect(m.poster).toMatch(/^\/media\/tracker\/[a-z-]+-v\d+\.webp$/);
    }
  });
});
