// Vibers Club colours: soft luxury for travellers. Warm ivory pages, white cards, deep forest-green
// ink and actions, a chartreuse highlight (selected days, "Book now"), and mint for quiet panels.
// Photos carry the colour; the interface stays calm around them.
export const COLORS = {
  ivory: '#f1efe6',
  card: '#fbfaf6',
  field: '#f2f0e8',
  mint: '#e1efe3',
  ink: '#14261b',
  forest: '#17301f',
  forestHover: '#22432c',
  chartreuse: '#c8da4a',
  olive: '#3c6b2b',
  live: '#2f9e57',
} as const;

/** The main action: forest green with ivory text. */
export const PRIMARY = 'bg-[#17301f] text-[#f6f4ec] hover:bg-[#22432c]';
/** The celebratory action ("Book now", "Apply"): chartreuse with forest text. */
export const HIGHLIGHT = 'bg-[#c8da4a] text-[#14261b] hover:bg-[#bccf3b]';
/** A white card on the ivory page. */
export const SURFACE = 'rounded-[28px] border border-[#14261b]/[0.06] bg-[#fbfaf6] shadow-[0_18px_40px_-30px_rgba(20,38,27,0.45)]';
