/** "Fri, 16 Oct 2026" for a billing day (YYYY-MM-DD), read in IST. */
export function dayLabel(day: string): string {
  return new Date(`${day}T12:00:00+05:30`).toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata',
  });
}
