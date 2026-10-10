import { describe, it, expect } from 'vitest';
import { parseItemNotes, splitPlace } from '@/lib/utils/kot-notes';

describe('Kitchen ticket lines: add-ons and instructions', () => {
  it('splits the add-ons from the item note and the table note', () => {
    expect(parseItemNotes('Cheese (+₹30), Extra Butter (+₹15) | no onion | serve starters first')).toEqual({
      addons: ['Cheese', 'Extra Butter'],
      instructions: ['no onion', 'serve starters first'],
    });
  });

  it('keeps an instruction whole even when it has commas', () => {
    expect(parseItemNotes('less salt, less oil')).toEqual({ addons: [], instructions: ['less salt, less oil'] });
  });

  it('shows the table note once, and nothing for an empty line', () => {
    expect(parseItemNotes('serve together | serve together')).toEqual({ addons: [], instructions: ['serve together'] });
    expect(parseItemNotes(undefined)).toEqual({ addons: [], instructions: [] });
    expect(parseItemNotes('  |  ')).toEqual({ addons: [], instructions: [] });
  });
});

describe('Kitchen ticket destination', () => {
  it('reads the table and whether the ticket is an add-on to an open order', () => {
    expect(splitPlace('T-01 (Add-on KOT)')).toEqual({ place: 'T-01', addon: true });
    expect(splitPlace('Room 204')).toEqual({ place: 'Room 204', addon: false });
    expect(splitPlace('')).toEqual({ place: 'Counter', addon: false });
  });
});
