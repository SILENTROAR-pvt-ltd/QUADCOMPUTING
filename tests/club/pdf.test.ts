import { describe, it, expect } from 'vitest';
import { buildPdf } from '@/components/club/pdf';

describe('Vector PDF writer (NOC and QR posters)', () => {
  it('writes a valid single-page PDF whose cross-reference offsets point at each object', async () => {
    const blob = buildPdf([{ x: 56, y: 80, size: 12, text: 'Paid ₹1,000 (in full) \\ done' }], { runs: { cells: 2, runs: [[0, 0, 2], [1, 1, 1]] }, x: 100, y: 100, size: 20 });
    const text = Buffer.from(await blob.arrayBuffer()).toString('latin1');
    expect(text.startsWith('%PDF-1.4')).toBe(true);
    expect(text.trimEnd().endsWith('%%EOF')).toBe(true);
    expect(text).toContain('(Paid Rs. 1,000 \\(in full\\) \\\\ done) Tj');
    expect(text.match(/ re f/g)).toHaveLength(2);

    const xrefAt = Number(/startxref\n(\d+)/.exec(text)![1]);
    expect(text.slice(xrefAt, xrefAt + 4)).toBe('xref');
    const offsets = Array.from(text.slice(xrefAt).matchAll(/^(\d{10}) 00000 n $/gm)).map((m) => Number(m[1]));
    expect(offsets).toHaveLength(6);
    offsets.forEach((o, i) => expect(text.slice(o).startsWith(`${i + 1} 0 obj`)).toBe(true));
    const stream = /\/Length (\d+) >>\nstream\n([\s\S]*?)\nendstream/.exec(text)!;
    expect(stream[2].length).toBe(Number(stream[1]));
  });
});
