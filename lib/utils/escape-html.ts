// Text that goes into an HTML string written with document.write (the print windows). Anything a person typed or an
// imported menu supplied (a guest name, an item name, an address) must be text there, never markup: the print window
// shares the app's origin, so a name like <img onerror=...> would run as script inside a host's signed-in session.

const ENTITIES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' };

export function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"'`]/g, (ch) => ENTITIES[ch]);
}
