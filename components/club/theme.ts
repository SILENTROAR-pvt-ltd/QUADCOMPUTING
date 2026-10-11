// Vibers Club colours: bright and warm. Deep violet ink for text, vivid violet for actions, one
// sunset-to-violet gradient for highlights, lavender tints for quiet surfaces. Fonts stay Vibers Connect's.
export const COLORS = {
  ink: '#2a1250',
  violet: '#7c3aed',
  violetDeep: '#6d28d9',
  pink: '#ff2e88',
  coral: '#ff6a3d',
  lavender: '#f3ebff',
  cream: '#fff7f0',
  /** Pink dark enough for small text on cream. */
  pinkText: '#be185d',
} as const;

export const AURA = 'bg-gradient-to-r from-[#ff6a3d] via-[#ff2e88] to-[#7c3aed]';
export const AURA_TEXT = `${AURA} bg-clip-text text-transparent`;
