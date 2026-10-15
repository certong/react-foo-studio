/**
 * "Today" for the demo data. The designs are set on Wed 14 Oct 2026, so mock deadlines line up.
 * Swap for `new Date()` once requests come from the API.
 */
export const DEMO_TODAY = new Date(2026, 9, 14);

export function today(): Date {
  return new Date(DEMO_TODAY);
}

const DAY = 24 * 60 * 60 * 1000;

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Whole days from `from` to `to` (negative when `to` is in the past). */
export function daysBetween(from: Date, to: Date): number {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY);
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

/** Parses a YYYY-MM-DD date as a local calendar day. */
export function parseDay(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "20 Oct" (en-GB would give "Sept", the designs use "Sep"). */
export function formatShort(d: Date): string {
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** "Wednesday, 14 October" */
export function formatLong(d: Date): string {
  const weekday = d.toLocaleDateString('en-GB', { weekday: 'long' });
  return `${weekday}, ${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}`;
}

export function greeting(hour = new Date().getHours()): string {
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
}

/** "2026-10-14" in local time. */
export function toIsoDay(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** "14 Oct" from a YYYY-MM-DD string. */
export function shortDay(iso: string): string {
  return formatShort(parseDay(iso));
}

/** Adds Monday–Friday days: 3 working days from Wed 14 Oct is Mon 19 Oct. */
export function addWorkingDays(d: Date, n: number): Date {
  let out = new Date(d);
  let left = n;
  while (left > 0) {
    out = addDays(out, 1);
    const day = out.getDay();
    if (day !== 0 && day !== 6) left -= 1;
  }
  return out;
}
