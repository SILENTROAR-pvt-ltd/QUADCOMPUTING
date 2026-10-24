'use client';

import React from 'react';
import { Check, ChefHat, Minus, Plus, Sparkles, Wallet } from 'lucide-react';
import { IPhoneFrame } from '@/components/landing-shots/IPhoneFrame';
import { DISPLAY } from '@/components/vibers/vibers-fonts';
import { PLAY_MENU, billOf, type PlayAction, type PlayState } from './play-state';
import s from '@/components/vibers/luxe.module.css';

const STEPS = [{ at: 'new', label: 'Received' }, { at: 'preparing', label: 'Being prepared' }, { at: 'ready', label: 'Ready for you' }] as const;
const ORDER = ['new', 'preparing', 'ready', 'settled'];

/** The guest's phone in the playable table: the luxe menu with a working tray, then the live tracker, then the paid bill. */
export function PlayPhone({ state, dispatch, turn }: { state: PlayState; dispatch: (a: PlayAction) => void; turn: boolean }) {
  const bill = billOf(state.cart);
  const at = ORDER.indexOf(state.stage);
  return (
    <IPhoneFrame url="vibersconnect.com" className="w-[250px] sm:w-[270px]">
      <div className="absolute inset-0 overflow-y-auto bg-[#f5f1e8] text-[#10231a] [scrollbar-width:none]">
        <div className="bg-[linear-gradient(160deg,#0f2a1e,#1d4632)] px-3 pb-4 pt-3 text-center text-[#f5f1e8]">
          <p className="text-left text-[8px] font-semibold uppercase tracking-[0.22em] text-[#d9c193]">Table T-0{state.table}</p>
          <p className={`${DISPLAY} mt-1 text-[1.35rem] leading-none`}>The Juniper Table</p>
          <p className="mt-1 text-[9px] italic text-[#f5f1e8]/70">Slow coffee, all-day plates</p>
        </div>

        {state.stage === 'ordering' ? (
          <div className="grid grid-cols-2 gap-2 p-2.5 pb-16">
            {PLAY_MENU.map((d) => {
              const q = state.cart[d.id] ?? 0;
              return (
                <div key={d.id} className={`rounded-[14px] border bg-[#fbf9f4] p-1.5 transition-shadow ${q ? 'border-[#b08d57] shadow-[0_0_0_2px_rgba(217,193,147,0.35)]' : 'border-[#e8dfcc]'}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={d.image} alt="" loading="lazy" className="aspect-square w-full rounded-[10px] object-cover" />
                  <p className={`${DISPLAY} mt-1 truncate text-[12.5px] font-semibold leading-tight`}>{d.name}</p>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-[10px] font-semibold">₹{d.price}</span>
                    <span className="flex items-center gap-1">
                      {q > 0 && <button type="button" aria-label={`One fewer ${d.name}`} onClick={() => dispatch({ type: 'remove', id: d.id })} className="grid h-6 w-6 place-items-center rounded-full border border-[#e8dfcc]"><Minus className="h-3 w-3" /></button>}
                      {q > 0 && <span className="w-3 text-center text-[10px] font-bold">{q}</span>}
                      <button type="button" aria-label={`Add ${d.name}`} onClick={() => dispatch({ type: 'add', id: d.id })}
                        className={`grid h-6 w-6 place-items-center rounded-full bg-[#0f2a1e] text-[#f5f1e8] ${turn && bill.items === 0 ? 'ring-2 ring-[#d9c193] ring-offset-1 ring-offset-[#fbf9f4]' : ''}`}><Plus className="h-3 w-3" /></button>
                    </span>
                  </div>
                </div>
              );
            })}
            <button type="button" onClick={() => dispatch({ type: 'send' })} disabled={bill.items === 0}
              className={`absolute inset-x-2.5 bottom-2.5 flex h-10 items-center justify-between rounded-full bg-[#0f2a1e] px-3.5 text-[10.5px] font-semibold text-[#f5f1e8] transition-all disabled:opacity-40 ${bill.items > 0 ? `${s.chipIn} ring-2 ring-[#d9c193]/70` : ''}`}>
              <span>{bill.items} items · ₹{bill.subtotal}</span><span>Send to kitchen →</span>
            </button>
          </div>
        ) : state.stage === 'settled' ? (
          <div className={`${s.fadeUp} p-3 text-center`}>
            <p className="mt-4 grid h-12 w-12 place-items-center justify-self-center rounded-full bg-emerald-100 text-emerald-800 [margin-inline:auto]"><Check className="h-6 w-6" /></p>
            <p className={`${DISPLAY} mt-3 text-[1.5rem] leading-none`}>Paid · ₹{bill.total.toFixed(2)}</p>
            <p className="mt-1 text-[10px] text-[#10231a]/60">UPI · Table T-0{state.table}</p>
            <p className="mt-4 flex items-center justify-center gap-1.5 rounded-xl border border-[#d9c193] bg-[#fbf6ea] p-2.5 text-[10.5px] font-semibold text-[#6f5631]">
              <Wallet className="h-3.5 w-3.5" /> ₹{bill.cashback.toFixed(2)} added to your wallet
            </p>
            <p className="mt-3 flex items-center justify-center gap-1 text-[10px] text-[#10231a]/55"><Sparkles className="h-3 w-3" /> Leave a postcard on the lounge wall</p>
          </div>
        ) : (
          <div className={`${s.fadeUp} space-y-2.5 p-3`}>
            <p className="text-[8.5px] font-semibold uppercase tracking-[0.2em] text-[#8a6d3f]">Your order · KOT #{state.ticket}</p>
            <ol className="space-y-2 rounded-[14px] border border-[#e8dfcc] bg-[#fbf9f4] p-3">
              {STEPS.map((st, i) => {
                const done = at > i; const now = at === i;
                return (
                  <li key={st.at} className="flex items-center gap-2 text-[11px]">
                    <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${done ? 'bg-[#0f2a1e] text-[#f5f1e8]' : now ? `${s.pulse} bg-[#d9c193] text-[#0f2a1e]` : 'border border-[#e8dfcc] text-[#10231a]/30'}`}>
                      {done ? <Check className="h-3 w-3" /> : <ChefHat className="h-3 w-3" />}
                    </span>
                    <span className={done || now ? 'font-semibold' : 'text-[#10231a]/40'}>{st.label}</span>
                  </li>
                );
              })}
            </ol>
            <ul className="space-y-1 text-[10.5px]">
              {PLAY_MENU.filter((d) => state.cart[d.id]).map((d) => <li key={d.id} className="flex justify-between"><span>{state.cart[d.id]}× {d.name}</span><span>₹{d.price * (state.cart[d.id] ?? 0)}</span></li>)}
              <li className="flex justify-between border-t border-[#e8dfcc] pt-1 font-semibold"><span>With 5% GST</span><span>₹{bill.total.toFixed(2)}</span></li>
            </ul>
          </div>
        )}
      </div>
    </IPhoneFrame>
  );
}
