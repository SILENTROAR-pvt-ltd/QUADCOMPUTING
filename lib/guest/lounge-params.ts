const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/** The venue from the URL: a UUID wherever it sits in the value, else its first token, else the fallback. */
export function resolveLoungeCafeId(rawParam: string, fallback: string): string {
  const uuid = rawParam.match(UUID);
  if (uuid) return uuid[0];
  return rawParam.trim().split(/[\s,]+/)[0] || fallback;
}
