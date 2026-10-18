// Next questions the co-pilot suggests, by the tab that is open. Pure data, safe for the browser bundle.
const CHIPS: Record<string, string[]> = {
  payments: ['What do I owe today?', 'Dues this week', 'Show bill ORD-001'],
  dashboard: ['Compare this week with last', 'Top dishes this week', 'Profit this month'],
  tables: ['Which tables have been open longest?', "Today's reservations", 'How did we do today?'],
  inventory: ["What's running low?", 'Top dishes today', 'How did we do today?'],
  guests: ['Guests this week', 'Top dishes today', 'How did we do today?'],
};
const DEFAULT_CHIPS = ['How did we do today?', 'Top dishes this week', "What's running low?"];

export const chipsFor = (tab?: string) => (tab && CHIPS[tab]) || DEFAULT_CHIPS;
