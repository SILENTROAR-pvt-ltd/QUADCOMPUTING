// One row per Vibey turn: what happened, never what was typed. Guests write names, phone numbers and allergies, so raw
// text is not stored (India's DPDP Act). Writing the row never fails a turn; a missing table is reported once.
export type VibeyPath = 'fastpath' | 'model' | 'fallback' | 'keyword';

export interface VibeyTurn {
  businessId: string;
  surface: 'guest' | 'host';
  tableNumber?: string | null;
  intent: string;
  /** Ids and quantities (guest) or tool names (host) only. */
  actions: unknown;
  path: VibeyPath;
  model?: string | null;
  latencyMs: number;
  tokensIn?: number;
  tokensOut?: number;
  errorCode?: string | null;
}

let warned = false;

export async function recordTurn(db: any, turn: VibeyTurn): Promise<void> {
  try {
    const { error } = await db.from('vibey_turns').insert({
      business_id: turn.businessId,
      surface: turn.surface,
      table_number: turn.tableNumber ?? null,
      intent: turn.intent.slice(0, 32),
      actions: turn.actions ?? [],
      path: turn.path,
      model: turn.model ?? null,
      latency_ms: Math.max(0, Math.round(turn.latencyMs)),
      tokens_in: turn.tokensIn ?? 0,
      tokens_out: turn.tokensOut ?? 0,
      error_code: turn.errorCode ?? null,
    });
    if (error && !warned) {
      warned = true;
      console.warn('[vibey] turn log not stored (is the vibey migration applied?):', error.message);
    }
  } catch (err: any) {
    if (!warned) {
      warned = true;
      console.warn('[vibey] turn log not stored:', err?.message);
    }
  }
}
