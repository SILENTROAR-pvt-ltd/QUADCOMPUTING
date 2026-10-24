// The plan states the live subscription test puts Bombay Rasoi through, and what each one must unlock and charge.
import type { Feature } from '@/lib/services/wallet/plans';

const DAY = 86_400_000;
export const at = (days: number) => new Date(Date.now() + days * DAY).toISOString();

export const ALL: Feature[] = ['core', 'events', 'offers', 'delivery', 'retention', 'rooms', 'viber_connect', 'viber_club', 'vibey'];
const M2: Feature[] = ['core', 'events', 'offers', 'delivery', 'retention'];

export interface PlanCase {
  key: string;
  label: string;
  sub: Record<string, unknown>;
  features: Feature[];
  /** ₹3 taken per settled bill. */
  fee: number;
  phase: string;
}

const base = { trial_ends_at: null, expires_at: null, vibey_until: null };

export const CASES: PlanCase[] = [
  { key: 'yewe', label: 'You earn, we earn (₹3 a bill)', sub: { ...base, plan_tier: 'pay_as_you_go', status: 'active' }, features: ALL, fee: 3, phase: 'payg' },
  { key: 'yewe_new_id', label: 'You earn, we earn (new id rhodium_ppb)', sub: { ...base, plan_tier: 'rhodium_ppb', status: 'active' }, features: ALL, fee: 3, phase: 'payg' },
  { key: 'm1_trial', label: 'M¹-Pro free month', sub: { ...base, plan_tier: 'm1_pro', status: 'trial', trial_ends_at: at(20) }, features: ['core'], fee: 0, phase: 'active' },
  { key: 'm1', label: 'M¹-Pro paid', sub: { ...base, plan_tier: 'm1_pro', status: 'active', expires_at: at(200) }, features: ['core'], fee: 0, phase: 'active' },
  { key: 'm1_vibey', label: 'M¹-Pro + Vibey add-on', sub: { ...base, plan_tier: 'm1_pro', status: 'active', expires_at: at(200), vibey_until: at(300) }, features: ['core', 'vibey'], fee: 0, phase: 'active' },
  { key: 'm1_ending', label: 'M¹-Pro, 10 days left', sub: { ...base, plan_tier: 'm1_pro', status: 'active', expires_at: at(10) }, features: ['core'], fee: 0, phase: 'expiring' },
  { key: 'm2_trial', label: 'M²-Pro free month', sub: { ...base, plan_tier: 'm2_pro', status: 'trial', trial_ends_at: at(25) }, features: M2, fee: 0, phase: 'active' },
  { key: 'm2', label: 'M²-Pro paid', sub: { ...base, plan_tier: 'm2_pro', status: 'active', expires_at: at(200) }, features: M2, fee: 0, phase: 'active' },
  { key: 'm2_vibey', label: 'M²-Pro + Vibey add-on', sub: { ...base, plan_tier: 'm2_pro', status: 'active', expires_at: at(200), vibey_until: at(300) }, features: [...M2, 'vibey'], fee: 0, phase: 'active' },
  { key: 'rhodium', label: 'Rhodium Pro yearly', sub: { ...base, plan_tier: 'rhodium_annual', status: 'active', expires_at: at(300) }, features: ALL, fee: 0, phase: 'active' },
  { key: 'm2_grace', label: 'M²-Pro ended 2 days ago (grace week)', sub: { ...base, plan_tier: 'm2_pro', status: 'active', expires_at: at(-2) }, features: M2, fee: 0, phase: 'grace' },
  { key: 'm2_ended', label: 'M²-Pro ended 10 days ago', sub: { ...base, plan_tier: 'm2_pro', status: 'active', expires_at: at(-10) }, features: ALL, fee: 3, phase: 'expired' },
  { key: 'm1_trial_over', label: 'M¹-Pro free month over (no grace)', sub: { ...base, plan_tier: 'm1_pro', status: 'trial', trial_ends_at: at(-1) }, features: ALL, fee: 3, phase: 'expired' },
  { key: 'addon_lapsed', label: 'M¹-Pro, Vibey add-on lapsed', sub: { ...base, plan_tier: 'm1_pro', status: 'active', expires_at: at(200), vibey_until: at(-1) }, features: ['core'], fee: 0, phase: 'active' },
  { key: 'legacy', label: 'Earlier plan (12k_6m) running', sub: { ...base, plan_tier: '12k_6m', status: 'active', expires_at: at(90) }, features: ALL, fee: 0, phase: 'active' },
];
