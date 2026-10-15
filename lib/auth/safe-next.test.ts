import { describe, it, expect } from 'vitest';
import { safeNextPath, withAuthMarker, suggestHandle } from './safe-next';
import { fullPhone } from '@/components/guest/account/VibersProfileForm';

describe('safeNextPath', () => {
  it('keeps a same-site path with its table and venue', () => {
    expect(safeNextPath('/menu?table=T-01&cafe_id=abc')).toBe('/menu?table=T-01&cafe_id=abc');
    expect(safeNextPath(encodeURIComponent('/menu?table=T-01&cafe_id=abc'))).toBe('/menu?table=T-01&cafe_id=abc');
  });

  it('refuses anything that could leave the site', () => {
    for (const bad of ['https://evil.example/x', '//evil.example', '/\\evil.example', 'javascript:alert(1)', 'menu', '', '/a\u0000b']) {
      expect(safeNextPath(bad)).toBe('/');
    }
    expect(safeNextPath(undefined)).toBe('/');
    expect(safeNextPath('%E0%A4%A')).toBe('/');
    expect(safeNextPath('/' + 'a'.repeat(700))).toBe('/');
  });
});

describe('withAuthMarker', () => {
  it('adds the marker without losing the table or venue', () => {
    const out = withAuthMarker('/menu?table=T-01&cafe_id=abc', 'google');
    const url = new URL(out, 'http://x');
    expect(url.pathname).toBe('/menu');
    expect(url.searchParams.get('table')).toBe('T-01');
    expect(url.searchParams.get('cafe_id')).toBe('abc');
    expect(url.searchParams.get('auth')).toBe('google');
  });
});

describe('suggestHandle', () => {
  it('prefers the name, then the start of the email', () => {
    expect(suggestHandle('Reshav Kumar', 'x@y.com')).toBe('reshavkumar');
    expect(suggestHandle('', 'harshit.singh@gmail.com')).toBe('harshitsingh');
    expect(suggestHandle('A', 'b@c.com')).toBe('');
    expect(suggestHandle(null, null)).toBe('');
  });
});

describe('fullPhone', () => {
  it('keeps the plain number for India and prefixes other countries', () => {
    expect(fullPhone('91', '98765 43210')).toBe('9876543210');
    expect(fullPhone('44', '07911 123456')).toBe('447911123456');
    expect(fullPhone('1', '(415) 555-0100')).toBe('14155550100');
  });
});
