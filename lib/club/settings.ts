// Global Club settings (platform fee, deposit share, payout approval), editable by super admins.
import { fail, must } from './http';

export const SETTING_DEFAULTS = {
  platform_fee_bps: 1000,
  deposit_bps: 1000,
  payout_requires_approval: true,
} as const;
export type SettingKey = keyof typeof SETTING_DEFAULTS;
export interface ClubSettings { platform_fee_bps: number; deposit_bps: number; payout_requires_approval: boolean }

export async function getSettings(db: any): Promise<ClubSettings> {
  const rows = must(await db.from('club_settings').select('key, value')) as Array<{ key: string; value: unknown }>;
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const num = (k: SettingKey, min: number, max: number) => {
    const v = Number(map.get(k));
    return Number.isInteger(v) && v >= min && v <= max ? v : (SETTING_DEFAULTS[k] as number);
  };
  const approval = map.get('payout_requires_approval');
  return {
    platform_fee_bps: num('platform_fee_bps', 0, 5000),
    deposit_bps: num('deposit_bps', 1, 10_000),
    payout_requires_approval: approval === undefined ? true : approval === true || approval === 'true',
  };
}

export async function updateSetting(db: any, key: unknown, value: unknown) {
  if (key === 'platform_fee_bps' || key === 'deposit_bps') {
    const v = Number(value);
    const max = key === 'platform_fee_bps' ? 5000 : 10_000;
    if (!Number.isInteger(v) || v < (key === 'deposit_bps' ? 1 : 0) || v > max) fail(400, 'Enter a whole number of basis points in range.');
    must(await db.from('club_settings').upsert([{ key, value: v, updated_at: new Date().toISOString() }], { onConflict: 'key' }));
    return;
  }
  if (key === 'payout_requires_approval') {
    must(await db.from('club_settings').upsert([{ key, value: value === true, updated_at: new Date().toISOString() }], { onConflict: 'key' }));
    return;
  }
  fail(400, 'Unknown setting.');
}
