// The guest menu's category stickers and greeting: every category a host might type gets a fitting sticker (or the
// plate), every sticker the menu can show is a real file in public/menu-stickers, and the greeting reads naturally.
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ALL_DISHES_STICKER, STICKER_CODES, stickerFor, stickerSrc } from './menu-stickers';
import { greetingFor, greetingName, initialsOf } from './greeting';

describe('Category stickers', () => {
  it('matches the names hosts use, most specific first', () => {
    const cases: Array<[string, string]> = [
      ['Pizza', '1f355'], ['Burgers', '1f354'], ['Sandwiches', '1f96a'], ['Pav Bhaji', '1f958'], ['Rolls', '1f32f'],
      ['Breads', '1f35e'], ['Rotis & Naans', '1fad3'], ['Dals & Lentils', '1f372'], ['Salads', '1f957'], ['Quick Bites', '1f35f'], ['Beverages', '1f964'],
      ['Hot Beverages', '2615'], ['Masala Tea', '1f375'], ['Noodles', '1f35c'], ['Momos', '1f95f'], ['Biryani', '1f35b'],
      ['North Indian', '1f35b'], ['Ice Creams', '1f368'], ['Desserts', '1f36e'], ['Mocktails', '1f379'], ['Steak House', '1f356'],
      ['South Indian', '1fad3'], ['Soups', '1f963'], ['Kebabs & Tikka', '1f362'],
    ];
    for (const [category, code] of cases) expect([category, stickerFor(category)]).toEqual([category, code]);
  });

  it('gives the all-dishes chip and anything unrecognised the plate', () => {
    expect(stickerFor('Dining')).toBe(ALL_DISHES_STICKER);
    expect(stickerFor('  ')).toBe(ALL_DISHES_STICKER);
    expect(stickerFor('Chef specials')).toBe(ALL_DISHES_STICKER);
    expect(stickerSrc('1f355')).toBe('/menu-stickers/1f355.webp');
  });

  it('every sticker the menu can show is a small file in public/menu-stickers', () => {
    for (const code of STICKER_CODES) {
      const file = join(process.cwd(), 'public', 'menu-stickers', `${code}.webp`);
      expect(existsSync(file), `${code}.webp is missing; run scripts/build-menu-stickers.mjs`).toBe(true);
      expect(statSync(file).size).toBeLessThan(12_000);
    }
  });
});

describe('Greeting', () => {
  it('says good morning, afternoon or evening by the hour', () => {
    expect(greetingFor(8)).toBe('Good morning');
    expect(greetingFor(13)).toBe('Good afternoon');
    expect(greetingFor(19)).toBe('Good evening');
    expect(greetingFor(2)).toBe('Good evening');
  });

  it('uses a real name, never "Guest", and shortens a long one', () => {
    expect(greetingName('Guest')).toBe('');
    expect(greetingName('  ')).toBe('');
    expect(greetingName('Harshit')).toBe('Harshit');
    expect(greetingName('Bombay Rasoi')).toBe('Bombay Rasoi');
    expect(greetingName('Alexandria Konstantinopoulos')).toBe('Alexandria');
  });

  it('makes avatar initials from a name or handle', () => {
    expect(initialsOf('Bombay Rasoi')).toBe('BR');
    expect(initialsOf('harshit')).toBe('H');
    expect(initialsOf('@vibe')).toBe('V');
    expect(initialsOf('')).toBe('·');
  });
});
