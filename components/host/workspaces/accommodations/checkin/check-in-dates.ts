// Values for <input type="datetime-local">: local wall-clock time, "YYYY-MM-DDTHH:mm".

const pad = (n: number) => String(n).padStart(2, '0');

export function toLocalInput(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const nowLocalInput = () => toLocalInput(new Date());

/** Standard checkout: 11:00 on the date `nights` after the check-in date. */
export function checkoutAfterNights(checkInLocal: string, nights: number): string {
  const d = new Date(checkInLocal);
  const base = Number.isNaN(d.getTime()) ? new Date() : d;
  const out = new Date(base);
  out.setDate(out.getDate() + Math.max(1, nights));
  out.setHours(11, 0, 0, 0);
  return toLocalInput(out);
}

/** The ISO instant of a datetime-local value, or null when it is empty or invalid. */
export function localInputToIso(value: string): string | null {
  const d = new Date(value);
  return value && !Number.isNaN(d.getTime()) ? d.toISOString() : null;
}
