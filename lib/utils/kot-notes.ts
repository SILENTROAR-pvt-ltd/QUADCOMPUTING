// What the kitchen reads from a ticket line. The guest order pipeline writes one "notes" string per item:
// "Cheese (+₹30), Extra spicy (+₹0) | no onion | serve starters first", that is the add-ons, then the
// item note, then the table note. Here it is split back into add-ons and instructions.
const ADDON = /\s*\(\+₹[\d.]+\)$/;

export interface ItemNotes {
  addons: string[];
  instructions: string[];
}

export function parseItemNotes(notes?: string | null): ItemNotes {
  const addons: string[] = [];
  const instructions: string[] = [];
  for (const part of String(notes ?? '').split('|').map((s) => s.trim()).filter(Boolean)) {
    const pieces = part.split(',').map((s) => s.trim()).filter(Boolean);
    if (pieces.length > 0 && pieces.every((p) => ADDON.test(p))) {
      for (const p of pieces) addons.push(p.replace(ADDON, ''));
    } else if (!instructions.includes(part)) {
      instructions.push(part);
    }
  }
  return { addons, instructions };
}

/** "T-01 (Add-on KOT)" is table T-01, and the ticket is an add-on to an open order. */
export function splitPlace(tableOrRoom?: string | null): { place: string; addon: boolean } {
  const raw = String(tableOrRoom ?? '').trim() || 'Counter';
  const addon = /\(add-on kot\)/i.test(raw);
  return { place: raw.replace(/\s*\(add-on kot\)/i, '').trim() || 'Counter', addon };
}
