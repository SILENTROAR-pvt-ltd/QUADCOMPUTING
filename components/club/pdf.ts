// A tiny vector PDF writer for one-page documents (the NOC certificate, QR campaign posters): text in
// Helvetica plus a QR code drawn as filled rectangles, so it prints sharp at any size. No dependency.

export interface QrRuns { cells: number; runs: Array<[number, number, number]> }
export interface PdfText { x: number; y: number; size: number; text: string; bold?: boolean; gray?: boolean }

/** Reads the dark-module runs out of a rendered <QRCodeSVG> (its foreground path is "M x y h w v1 …"). */
export function qrFromSvg(svg: SVGSVGElement | null): QrRuns | null {
  if (!svg) return null;
  const paths = svg.querySelectorAll('path');
  const d = paths[paths.length - 1]?.getAttribute('d') || '';
  const cells = Number((svg.getAttribute('viewBox') || '').split(/\s+/)[2]) || 0;
  const runs: Array<[number, number, number]> = [];
  for (const m of Array.from(d.matchAll(/M(\d+)[ ,](\d+)\s*h(\d+)v1H\d+z/g))) runs.push([Number(m[1]), Number(m[2]), Number(m[3])]);
  return cells && runs.length ? { cells, runs } : null;
}

const W = 595, H = 842; // A4 in points

/** Latin-1 only (PDF base fonts); the rupee sign becomes "Rs." and anything else unknown becomes "?". */
function pdfString(s: string) {
  const latin = s.replace(/₹\s?/g, 'Rs. ').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-').replace(/·/g, '-').replace(/[^\x20-\x7e\xa0-\xff]/g, '?');
  return `(${latin.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')})`;
}

export function buildPdf(texts: PdfText[], qr?: { runs: QrRuns; x: number; y: number; size: number }): Blob {
  const ops: string[] = [];
  for (const t of texts) ops.push(`BT ${t.gray ? '0.4 0.4 0.4' : '0.11 0.09 0.08'} rg /${t.bold ? 'F2' : 'F1'} ${t.size} Tf ${t.x} ${H - t.y} Td ${pdfString(t.text)} Tj ET`);
  if (qr) {
    const cell = qr.size / qr.runs.cells;
    ops.push('0 0 0 rg');
    for (const [x, y, w] of qr.runs.runs) ops.push(`${(qr.x + x * cell).toFixed(2)} ${(H - qr.y - (y + 1) * cell).toFixed(2)} ${(w * cell).toFixed(2)} ${cell.toFixed(2)} re f`);
  }
  const content = ops.join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>`,
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
  ];
  let out = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((o, i) => { offsets.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  const bytes = new Uint8Array(out.length);
  for (let i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 0xff;
  return new Blob([bytes], { type: 'application/pdf' });
}

export function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
