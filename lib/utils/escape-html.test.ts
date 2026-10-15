// A printed bill shows what was typed, never runs it.
import { describe, expect, it } from 'vitest';
import { escapeHtml } from './escape-html';

describe('escapeHtml', () => {
  it('turns markup into visible text', () => {
    expect(escapeHtml('<img src=x onerror="alert(1)">')).toBe('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
    expect(escapeHtml(`Tom & Jerry's <b>"Cafe"</b>`)).toBe('Tom &amp; Jerry&#39;s &lt;b&gt;&quot;Cafe&quot;&lt;/b&gt;');
    expect(escapeHtml('</title><script>steal()</script>')).toBe('&lt;/title&gt;&lt;script&gt;steal()&lt;/script&gt;');
  });

  it('leaves ordinary text, numbers and rupee amounts alone, and never prints "undefined"', () => {
    expect(escapeHtml('Paneer Makhni Roll')).toBe('Paneer Makhni Roll');
    expect(escapeHtml(250)).toBe('250');
    expect(escapeHtml('₹1,250.50 • Room 101')).toBe('₹1,250.50 • Room 101');
    expect(escapeHtml(undefined)).toBe('');
    expect(escapeHtml(null)).toBe('');
  });
});
