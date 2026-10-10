// Smart Stock Images in full: the venue's photos and exact stock matches first, then the photo agent for
// the dishes that still have no photo.
import { autoFillDishPhotos, type AutoFillResult } from './photo-autofill';
import { searchStock } from './photo-sources';
import { agentWebPass, type WebPassDeps, type WebPassResult } from './web-photo-pass';
import type { GenerateJson } from './vault-describe';

export interface SmartPhotosResult extends Omit<AutoFillResult, 'matched' | 'unmatched' | 'has_more'> {
  matched: AutoFillResult['matched'];
  unmatched: { id: string; name: string }[];
  agent_rejected: WebPassResult['rejected'];
  has_more: boolean;
}

export async function runSmartPhotos(db: any, businessId: string, generate: GenerateJson | undefined, agent: WebPassDeps | undefined): Promise<SmartPhotosResult> {
  const first = await autoFillDishPhotos(db, businessId, generate, searchStock);
  if (!agent || first.unmatched.length === 0) return { ...first, agent_rejected: [] };

  const open = first.unmatched.map((d) => ({ ...d, category: '' }));
  const pass = await agentWebPass(db, businessId, open, agent);
  const doneIds = new Set(pass.matched.map((m) => m.id));
  return {
    ...first,
    count: first.count + pass.matched.length,
    matched: [...first.matched, ...pass.matched],
    unmatched: first.unmatched.filter((d) => !doneIds.has(d.id)),
    agent_rejected: pass.rejected,
    has_more: first.has_more || pass.skipped > 0,
    stock_error: first.stock_error ?? pass.error,
  };
}
