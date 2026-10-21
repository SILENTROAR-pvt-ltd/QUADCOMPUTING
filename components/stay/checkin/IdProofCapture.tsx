'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, RefreshCw, ShieldCheck } from 'lucide-react';
import { stayButton } from '../StayShell';

interface Props { uploaded: boolean; uploading: boolean; onFile: (file: File) => void; onBack: () => void; onNext: () => void }

/** Step 2: a photo of the government ID, taken with the camera or chosen from the phone, uploaded straight away. */
export function IdProofCapture({ uploaded, uploading, onFile, onBack, onNext }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const pick = (file: File | undefined) => {
    if (!file) return;
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
    onFile(file);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-neutral-200 bg-white p-4 text-xs leading-relaxed text-neutral-700">
        <p className="inline-flex items-center gap-2 font-semibold text-neutral-950"><ShieldCheck className="h-4 w-4 text-emerald-600" /> Kept private</p>
        <p className="mt-1">The photo is stored encrypted at rest, shown only to the front desk through a link that expires in minutes, and is never public. Indian law requires a photo ID for every stay.</p>
      </div>

      <input ref={input} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />

      <button type="button" onClick={() => input.current?.click()} disabled={uploading}
        className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-[1.75rem] border border-dashed border-neutral-300 bg-white text-neutral-500 transition hover:border-neutral-400">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- a local preview of the photo just taken
          <img src={preview} alt="Your ID" className="h-full w-full object-cover" />
        ) : (
          <span className="flex flex-col items-center gap-2 text-sm"><Camera className="h-8 w-8" /> Take a photo of the ID</span>
        )}
        {uploading && <span className="absolute inset-0 flex items-center justify-center bg-white/70 text-xs font-mono uppercase tracking-widest text-neutral-950"><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Uploading</span>}
        {uploaded && !uploading && <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-emerald-500/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-950"><CheckCircle2 className="h-3.5 w-3.5" /> Uploaded</span>}
      </button>

      {preview && <button type="button" onClick={() => input.current?.click()} className="text-xs text-neutral-500 underline underline-offset-4 hover:text-neutral-950">Retake</button>}

      <div className="flex gap-3">
        <button type="button" onClick={onBack} className={`${stayButton.ghost} flex-1`}>Back</button>
        <button type="button" disabled={!uploaded || uploading} onClick={onNext} className={`${stayButton.primary} flex-[2]`}>Next · confirm</button>
      </div>
    </div>
  );
}
