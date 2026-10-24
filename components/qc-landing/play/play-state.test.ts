import { describe, expect, it } from 'vitest';
import { START_PLAY, billOf, playReducer, type PlayAction, type PlayState } from './play-state';

const run = (actions: PlayAction[], from: PlayState = START_PLAY) => actions.reduce(playReducer, from);

describe('the playable table', () => {
  it('adds GST and works out the 7% cashback', () => {
    expect(billOf({ cap: 2, pae: 1 })).toEqual({ subtotal: 900, gst: 45, total: 945, cashback: 66.15, items: 3 });
  });

  it('will not send an empty tray', () => {
    expect(run([{ type: 'send' }]).stage).toBe('ordering');
  });

  it('walks one order from the tray to a settled bill and moves the day', () => {
    const s = run([{ type: 'add', id: 'cap' }, { type: 'add', id: 'cap' }, { type: 'add', id: 'pae' }, { type: 'send' }, { type: 'prepare' }, { type: 'ready' }, { type: 'settle' }]);
    expect(s.stage).toBe('settled');
    expect(s.day).toEqual({ bills: 1, sales: 945, fees: 3, cashback: 66.15 });
  });

  it('only takes each step in its turn', () => {
    expect(run([{ type: 'add', id: 'cap' }, { type: 'ready' }]).stage).toBe('ordering');
    expect(run([{ type: 'add', id: 'cap' }, { type: 'send' }, { type: 'add', id: 'skw' }]).cart).toEqual({ cap: 1 });
  });

  it('seats the next table with an empty tray and keeps the day', () => {
    const s = run([{ type: 'add', id: 'brk' }, { type: 'send' }, { type: 'prepare' }, { type: 'ready' }, { type: 'settle' }, { type: 'next' }]);
    expect(s).toMatchObject({ stage: 'ordering', cart: {}, table: 5, ticket: 143 });
    expect(s.day.bills).toBe(1);
  });
});
