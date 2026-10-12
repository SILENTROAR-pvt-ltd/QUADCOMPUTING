'use client';

import React, { useId } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { GENERATION_LABEL } from '../api';
import { CLUB_DISPLAY } from '../fonts';
import styles from '../club.module.css';
import { VerifiedSeal } from './VerifiedSeal';

const W = 520;
const H = 340;

/** One fine wavy line of the engraved background, like the guilloche on a banknote or passport page. */
function wave(i: number): string {
  const base = 14 + i * 21;
  const amp = 9 + (i % 4) * 3;
  const phase = i * 0.5;
  const pts: string[] = [];
  for (let x = 0; x <= W; x += 8) {
    const y = base + amp * Math.sin(x / 38 + phase) + amp * 0.5 * Math.sin(x / 17 - phase);
    pts.push(`${x === 0 ? 'M' : 'L'}${x} ${y.toFixed(1)}`);
  }
  return pts.join(' ');
}
const ENGRAVING = Array.from({ length: 16 }, (_, i) => wave(i));

/** Machine-readable line, as on a passport: capitals and digits, "<" for gaps, padded to a fixed width. */
function mrz(text: string, width = 32): string {
  return text.toUpperCase().replace(/[^A-Z0-9<]/g, '<').padEnd(width, '<').slice(0, width);
}

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-[#d9bf7a]/80">{label}</p>
      <p className="mt-0.5 truncate text-[13px] font-medium text-[#f6efe0]">{children}</p>
    </div>
  );
}

/** The photo, as a small upright rectangle like the portrait on a visa; gold initials when there is none. */
function Portrait({ url, name }: { url: string | null | undefined; name: string }) {
  const initials = name.split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase();
  return (
    <span className="block h-[84px] w-[66px] shrink-0 rounded-[10px] bg-gradient-to-br from-[#ecd9a1] to-[#b8964a] p-[2px] shadow-[0_10px_20px_-12px_rgba(0,0,0,0.8)]">
      {url
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={url} alt="" className="h-full w-full rounded-[8px] object-cover" />
        : <span aria-hidden="true" className={`${CLUB_DISPLAY} grid h-full w-full place-items-center rounded-[8px] bg-[#2b2822] text-2xl font-semibold text-[#ecd9a1]`}>{initials || '✦'}</span>}
    </span>
  );
}

/**
 * The Club Visa: the member's travel document for every Vibers property. A rectangular card in warm
 * charcoal and cream with an antique-gold glow, an engraved line pattern and a faint globe, a verified
 * seal, the face and key facts, a gold chip, a QR (which carries the real Viber ID), and the
 * machine-readable lines along the bottom edge.
 */
export function ViberVisa({ profile, viberId }: { profile: any; viberId: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  // The handle shown is the same one the profile shows: the Club username if set, otherwise the Viber ID.
  const handle: string = profile.club_username || viberId.replace(/^@/, '');
  const name: string = profile.alias || handle;
  const since = new Date(profile.reviewed_at || profile.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  const generation = GENERATION_LABEL[profile.generation as keyof typeof GENERATION_LABEL] ?? '';
  const visaNo: string = profile.pass_number ?? '';
  return (
    <section aria-label="Club Visa" className="relative mx-auto w-full max-w-xl overflow-hidden rounded-[18px] p-[2px] shadow-[0_40px_80px_-38px_rgba(40,32,18,0.85)]">
      <div className={`${styles.visaEdge} absolute inset-0`} aria-hidden="true" />
      <div className="relative overflow-hidden rounded-[16px] bg-gradient-to-br from-[#2c2924] via-[#201e1a] to-[#151412] text-[#f6efe0]">
        <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice">
          <defs>
            <radialGradient id={`${id}f`} cx="0.85" cy="0.1" r="0.7">
              <stop offset="0" stopColor="#d9bf7a" stopOpacity="0.3" />
              <stop offset="1" stopColor="#d9bf7a" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width={W} height={H} fill={`url(#${id}f)`} />
          <g fill="none" stroke="#d9bf7a" strokeOpacity="0.07" strokeWidth="0.8">
            {ENGRAVING.map((d, i) => <path key={i} d={d} />)}
          </g>
          <g fill="none" stroke="#ecd9a1" strokeOpacity="0.1" strokeWidth="0.8">
            <circle cx="430" cy="110" r="46" /><circle cx="430" cy="110" r="86" /><circle cx="430" cy="110" r="126" />
            <ellipse cx="430" cy="110" rx="20" ry="86" /><ellipse cx="430" cy="110" rx="52" ry="86" />
            <path d="M344 110H516" />
          </g>
        </svg>

        <div className="relative space-y-3.5 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.34em] text-[#d9bf7a]">Vibers Club</p>
              <p className={`${CLUB_DISPLAY} mt-1.5 text-[34px] font-semibold leading-none sm:text-[38px]`}>Club <em className="font-medium text-[#ecd9a1]">Visa</em></p>
            </div>
            <VerifiedSeal size={58} className="shrink-0 drop-shadow-[0_8px_16px_rgba(0,0,0,0.35)] sm:hidden" />
          </div>

          <div className="flex items-center gap-4">
            <Portrait url={profile.avatar_url} name={name} />
            <div className="grid min-w-0 flex-1 grid-cols-2 gap-x-4 gap-y-2.5">
              <Field label="Name" className="col-span-2"><span className={`${CLUB_DISPLAY} text-[20px] font-semibold`}>{name}</span></Field>
              <Field label="Handle" className="col-span-2 sm:col-span-1">@{handle}</Field>
              <Field label="Home" className="col-span-2 sm:col-span-1">{profile.city}</Field>
            </div>
            <div className="hidden shrink-0 rounded-lg bg-[#f8f1e2] p-1.5 shadow-[0_10px_24px_-14px_rgba(0,0,0,0.7)] sm:block">
              <QRCodeSVG value={`CLUB-VISA:${visaNo}:${viberId}`} size={68} level="M" bgColor="#f8f1e2" fgColor="#26231e" />
            </div>
          </div>

          <div className="flex items-end justify-between gap-4 border-t border-dashed border-[#f6efe0]/20 pt-3.5">
            <div className="flex min-w-0 items-center gap-3.5">
              <svg aria-hidden="true" width="40" height="30" viewBox="0 0 40 30" className="shrink-0">
                <defs>
                  <linearGradient id={`${id}c`} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#f6e7a8" /><stop offset="0.5" stopColor="#d9b95a" /><stop offset="1" stopColor="#a9873a" />
                  </linearGradient>
                </defs>
                <rect x="0.5" y="0.5" width="39" height="29" rx="4" fill={`url(#${id}c)`} stroke="#8a6d1f" strokeOpacity="0.5" />
                <path d="M0.5 10H14V20H0.5M39.5 10H26V20H39.5M14 10V0.5M26 10V0.5M14 20V29.5M26 20V29.5M14 15H26" fill="none" stroke="#8a6d1f" strokeOpacity="0.55" strokeWidth="1" />
              </svg>
              <div className="min-w-0 space-y-1.5">
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-[#d9bf7a]/80">Visa no.</p>
                  <p className="mt-0.5 truncate font-mono text-[13px] tracking-[0.12em]">{visaNo}</p>
                </div>
                <p className="text-[11px] text-[#f6efe0]/60">{generation && `${generation} · `}Member since {since}</p>
              </div>
            </div>
            <div className="shrink-0 rounded-lg bg-[#f8f1e2] p-1.5 shadow-[0_10px_24px_-14px_rgba(0,0,0,0.7)] sm:hidden">
              <QRCodeSVG value={`CLUB-VISA:${visaNo}:${viberId}`} size={58} level="M" bgColor="#f8f1e2" fgColor="#26231e" />
            </div>
            <VerifiedSeal size={68} className="-mb-1 hidden shrink-0 drop-shadow-[0_8px_16px_rgba(0,0,0,0.45)] sm:block" />
          </div>

          <div aria-hidden="true" className="select-none overflow-hidden whitespace-nowrap font-mono text-[11px] leading-5 tracking-[0.2em] text-[#f6efe0]/45 sm:text-[12px]">
            <p>{mrz(`V<VBR<<${name}`)}</p>
            <p>{mrz(`${visaNo}<${generation}<${profile.city}`)}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
