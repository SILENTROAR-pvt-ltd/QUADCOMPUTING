'use client';

import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { DISPLAY } from '@/components/vibers/vibers-fonts';
import { Avatar } from '../ui';
import { GENERATION_LABEL } from '../api';
import styles from '../club.module.css';

/** The holographic Viber Pass: Viber ID, pass number and generation, with a QR of the pass. */
export function ViberPass({ profile, viberId }: { profile: any; viberId: string }) {
  const name = profile.alias || viberId;
  const since = new Date(profile.reviewed_at || profile.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  return (
    <div className="relative mx-auto aspect-[1.586] w-full max-w-md overflow-hidden rounded-[28px] p-[2px] shadow-[0_30px_80px_-30px_rgba(124,58,237,0.7)]">
      <div className={`${styles.holo} absolute inset-0`} aria-hidden="true" />
      <div className="relative flex h-full flex-col justify-between rounded-[26px] bg-[#2a1250]/85 p-5 text-white backdrop-blur-sm sm:p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/60">Vibers Club</p>
            <p className={`${DISPLAY} text-2xl leading-tight`}>Viber <em>Pass</em></p>
          </div>
          <div className="rounded-xl bg-white p-1.5">
            <QRCodeSVG value={`VIBERS-PASS:${profile.pass_number}:${viberId}`} size={64} level="M" />
          </div>
        </div>
        <div className="flex items-end gap-3">
          <Avatar url={profile.avatar_url} name={name} size={52} />
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold">{name}</p>
            <p className="truncate text-sm text-white/70">{viberId}</p>
          </div>
        </div>
        <div className="flex items-end justify-between text-[11px] text-white/70">
          <span><span className="block text-white/45">Pass no.</span><span className="font-mono text-sm tracking-wider text-white">{profile.pass_number}</span></span>
          <span className="text-right"><span className="block text-white/45">{GENERATION_LABEL[profile.generation]} · {profile.city}</span>Member since {since}</span>
        </div>
      </div>
    </div>
  );
}
