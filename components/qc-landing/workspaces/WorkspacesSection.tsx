'use client';

import React, { useState } from 'react';
import { Reveal } from '@/components/vibers/Reveal';
import { DISPLAY } from '@/components/vibers/vibers-fonts';
import { CONTAINER, H2, KICKER, LEAD, SECTION, TURN } from '../qc-brand';
import { ROLES, WORKSPACES, type Role } from './workspaces-data';

/**
 * The fifteen workspaces as one grid, with a row of roles above it: choosing one brings that person's workspaces forward
 * and lets the rest recede, so an owner, a chef or a front-desk manager sees their own day in it.
 */
export function WorkspacesSection() {
  const [role, setRole] = useState<Role | 'all'>('all');
  const count = role === 'all' ? WORKSPACES.length : WORKSPACES.filter((w) => w.roles.includes(role)).length;

  return (
    <section id="workspaces" aria-labelledby="workspaces-title" className={`${SECTION} bg-[#f6f3ec] text-[#0c0f0d]`}>
      <div className={CONTAINER}>
        <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-2xl">
            <Reveal><p className={KICKER}>Quad Computing for hosts</p></Reveal>
            <Reveal index={1}><h2 id="workspaces-title" className={`${DISPLAY} ${H2}`}>Fifteen workspaces. <em className={TURN}>One login.</em></h2></Reveal>
            <Reveal index={2}><p className={`${LEAD} mt-6`}>Everything a restaurant, café or stay needs for a day of service. Each person sees their part; the owner sees all of it.</p></Reveal>
          </div>
          <Reveal index={2}>
            <div role="group" aria-label="Show the workspaces for" className="flex flex-wrap gap-2">
              {ROLES.map((r) => (
                <button key={r.id} type="button" aria-pressed={role === r.id} onClick={() => setRole(r.id)}
                  className={`h-10 rounded-full px-4 text-[12.5px] font-semibold transition-all duration-300 ${role === r.id ? 'bg-[#0c0f0d] text-[#f6f3ec]' : 'border border-[#0c0f0d]/15 text-[#0c0f0d]/70 hover:border-[#0c0f0d]/40'}`}>
                  {r.label}
                </button>
              ))}
            </div>
          </Reveal>
        </div>
        <p aria-live="polite" className="sr-only">{count} workspaces shown</p>

        <Reveal index={1}>
          <ul className="mt-12 grid gap-px overflow-hidden rounded-[24px] border border-[#e6dfcf] bg-[#e6dfcf] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {WORKSPACES.map((w) => {
              const on = role === 'all' || w.roles.includes(role);
              return (
                <li key={w.name} className={`group bg-[#fbf9f4] p-6 transition-all duration-500 ${on ? 'opacity-100' : 'opacity-35 saturate-0'}`}>
                  <span className={`grid h-10 w-10 place-items-center rounded-xl border transition-colors duration-500 ${on && role !== 'all' ? 'border-[#b08d57] bg-[#0c0f0d] text-[#d9c193]' : 'border-[#0c0f0d]/10 text-[#0c0f0d] group-hover:border-[#b08d57]'}`}>
                    <w.icon aria-hidden="true" className="h-[18px] w-[18px]" />
                  </span>
                  <h3 className="mt-5 text-[15px] font-semibold">{w.name}</h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-[#0c0f0d]/60">{w.text}</p>
                </li>
              );
            })}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
