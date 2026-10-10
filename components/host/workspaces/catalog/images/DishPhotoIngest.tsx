'use client';

import React, { useState } from 'react';
import { X, Upload, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { apiRequest, jsonRequest } from '@/lib/utils/api-client';

const BATCH = 10;
const MAX_BYTES = 4.5 * 1024 * 1024;
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];

interface IngestRow { filename: string; status: 'added' | 'failed'; title?: string; dish_names?: string[]; reason?: string }
interface Summary { added: IngestRow[]; failed: IngestRow[]; matched: number; exact: number; agent: number; stillNeeded: string[]; vision: string }

const readBase64 = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
  reader.onerror = () => reject(new Error('Could not read that file.'));
  reader.readAsDataURL(file);
});

/**
 * Ingest dish photos in one go: each photo is stored and read by the vision model for its dish names,
 * then the matching pipeline runs and assigns verified photos to dishes automatically.
 */
export function DishPhotoIngest({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);

  const pick = (list: FileList | null) => {
    setError(null);
    const chosen = Array.from(list || []);
    const bad = chosen.find((f) => !TYPES.includes(f.type) || f.size > MAX_BYTES);
    if (bad) setError(`"${bad.name}" must be a JPG, PNG or WebP under 4.5 MB.`);
    setFiles(chosen.filter((f) => TYPES.includes(f.type) && f.size <= MAX_BYTES).slice(0, 50));
  };

  const run = async () => {
    if (files.length === 0) return;
    setError(null);
    setSummary(null);
    const rows: IngestRow[] = [];
    let vision = 'off';
    try {
      for (let i = 0; i < files.length; i += BATCH) {
        setBusy(`Reading photos ${Math.min(i + BATCH, files.length)} of ${files.length}…`);
        const chunk = files.slice(i, i + BATCH);
        const photos = await Promise.all(chunk.map(async (f) => ({ filename: f.name, mimeType: f.type, base64: await readBase64(f) })));
        const res = await apiRequest<any>('/api/host/catalog/vault/ingest', jsonRequest('POST', { photos }));
        if (!res.ok) throw new Error(res.error || 'Photo ingest failed.');
        rows.push(...(res.data?.results || []));
        vision = res.data?.vision || vision;
      }

      // The matching pipeline runs straight after ingest, so the new photos are used at once.
      let matched = 0, exact = 0, agent = 0;
      let stillNeeded: string[] = [];
      for (let round = 0; round < 6; round++) {
        setBusy('Matching photos to dishes…');
        const res = await apiRequest<any>('/api/host/catalog/auto-fill-images', { method: 'POST', cache: 'no-store' } as RequestInit);
        if (!res.ok) throw new Error(res.error || 'Matching failed.');
        const d = res.data;
        matched += d.count || 0;
        exact += (d.matched || []).filter((m: any) => m.method === 'exact').length;
        agent += (d.matched || []).filter((m: any) => m.method === 'agent').length;
        stillNeeded = (d.unmatched || []).map((u: any) => u.name);
        // Stop when nothing more can be matched, or the venue has no dishes left to check.
        if (!d.has_more || d.count === 0) break;
      }

      setSummary({
        added: rows.filter((r) => r.status === 'added'),
        failed: rows.filter((r) => r.status === 'failed'),
        matched, exact, agent, stillNeeded, vision,
      });
      onDone();
    } catch (e: any) {
      setError(e.message || 'Something went wrong. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Ingest dish photos" className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral-950/40 p-4" onClick={busy ? undefined : onClose}>
      <div className="flex max-h-[88vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-neutral-100 px-6 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-400">Photo ingest</p>
            <h2 className="font-serif text-xl text-neutral-950">Ingest dish photos</h2>
            <p className="mt-1 text-xs text-neutral-500">Add photos of your dishes. They are read automatically and matched to the menu.</p>
          </div>
          <button type="button" onClick={onClose} disabled={!!busy} aria-label="Close" className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 disabled:opacity-40 cursor-pointer"><X className="h-4 w-4" /></button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 px-6 py-10 text-center hover:border-neutral-500">
            <Upload className="h-5 w-5 text-neutral-500" />
            <span className="text-sm font-medium text-neutral-800">{files.length ? `${files.length} photo${files.length === 1 ? '' : 's'} ready` : 'Choose photos'}</span>
            <span className="text-[11px] text-neutral-500">JPG, PNG or WebP, up to 4.5 MB each</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" disabled={!!busy} onChange={(e) => pick(e.target.files)} />
          </label>

          {busy && <p className="flex items-center gap-2 text-sm text-neutral-600"><Loader2 className="h-4 w-4 animate-spin" /> {busy}</p>}
          {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}

          {summary && (
            <div className="space-y-4">
              <div className="rounded-xl border border-neutral-200 p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-neutral-900"><CheckCircle2 className="h-4 w-4" /> {summary.added.length} photo{summary.added.length === 1 ? '' : 's'} added</p>
                <p className="mt-1 text-xs text-neutral-600">Matched to dishes: {summary.matched} ({summary.exact} by name, {summary.agent} by the matching agent).</p>
                <p className="mt-1 text-[11px] text-neutral-500">Photo reading: {summary.vision === 'on' ? 'on' : 'off, titles came from file names'}.</p>
              </div>
              {summary.stillNeeded.length > 0 && (
                <div className="rounded-xl border border-neutral-200 p-4">
                  <p className="text-xs font-semibold text-neutral-900">Still need a photo ({summary.stillNeeded.length})</p>
                  <p className="mt-1 text-xs leading-relaxed text-neutral-600">{summary.stillNeeded.slice(0, 40).join(', ')}{summary.stillNeeded.length > 40 ? '…' : ''}</p>
                </div>
              )}
              {summary.failed.length > 0 && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                  <p className="flex items-center gap-2 text-xs font-semibold text-rose-800"><AlertCircle className="h-3.5 w-3.5" /> {summary.failed.length} not added</p>
                  <ul className="mt-2 space-y-1 text-[11px] text-rose-800">
                    {summary.failed.map((f) => <li key={f.filename}>{f.filename}: {f.reason}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-neutral-100 px-6 py-4">
          <button type="button" onClick={onClose} disabled={!!busy} className="rounded-xl px-4 py-2.5 text-sm font-medium text-neutral-600 hover:bg-neutral-100 disabled:opacity-40 cursor-pointer">{summary ? 'Done' : 'Cancel'}</button>
          {!summary && (
            <button type="button" onClick={run} disabled={!!busy || files.length === 0} className="rounded-xl bg-neutral-950 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40 cursor-pointer">
              Ingest and match
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default DishPhotoIngest;
