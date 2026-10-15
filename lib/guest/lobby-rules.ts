// Vibers Lobby: what a guest may post, and the limits. Shared by the browser and the server.

// 'want' is retired: old ones stay in the database (and can still be read), but no new one can be made.
export const LOBBY_KINDS = ['message', 'moment', 'want'] as const;
export type LobbyKind = (typeof LOBBY_KINDS)[number];

export const LOBBY_CONTENT_MAX = 500;
export const LOBBY_REPLY_MAX = 300;
export const LOBBY_REPLIES_PAGE = 100;
export const LOBBY_MEDIA_MAX_BYTES = 1200 * 1024;
export const LOBBY_MEDIA_SIDE_PX = 1080;
export const LOBBY_PAGE_MAX = 40;
export const LOBBY_PAGE_DEFAULT = 20;

export function isLobbyKind(value: unknown): value is LobbyKind {
  return typeof value === 'string' && (LOBBY_KINDS as readonly string[]).includes(value);
}

/** Plain text, one paragraph, without markup. Blank lines and runs of spaces are collapsed. */
export function cleanLobbyContent(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f<>]/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, LOBBY_CONTENT_MAX)
    .trim();
}

/** The reason a post can't be saved, or null when it can. */
export function lobbyPostError(input: { kind: unknown; content: string; hasMedia: boolean }): string | null {
  if (!isLobbyKind(input.kind)) return 'Choose message or postcard.';
  if (input.kind === 'want') return 'Wants have been retired. Share a message or a postcard instead.';
  if (input.kind === 'moment' && !input.hasMedia) return 'A moment needs a photo.';
  if (!input.content && !input.hasMedia) return 'Write something to share.';
  return null;
}

/** The reason a reply can't be sent, or null when it can. Replies are one short line of text. */
export function lobbyReplyError(content: string): string | null {
  if (!content) return 'Write a reply first.';
  if (content.length > LOBBY_REPLY_MAX) return `Keep replies under ${LOBBY_REPLY_MAX} characters.`;
  return null;
}

export function lobbyPageLimit(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) return LOBBY_PAGE_DEFAULT;
  return Math.min(n, LOBBY_PAGE_MAX);
}
