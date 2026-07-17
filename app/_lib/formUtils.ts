/** Shared FormData helpers for server actions (kept out of 'use server' files — those may only export async functions). */

export function now(): number {
  return Math.floor(Date.now() / 1000);
}

export function formString(formData: FormData, key: string, fallback = ''): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : fallback;
}

/** Like `formString`, but returns `null` for an empty/missing value — for optional DB columns. */
export function formOptionalString(formData: FormData, key: string): string | null {
  const value = formString(formData, key);
  return value === '' ? null : value;
}

/**
 * Parses a date-only string ('YYYY-MM-DD', e.g. from `<input type="date">`)
 * as **local** midnight. `new Date('YYYY-MM-DD')` parses as UTC midnight per
 * the ECMA-262 Date Time String Format — for a user west of UTC that shifts
 * the stored instant back onto the previous local day, which then displays
 * one day earlier than entered. Returns `null` for an invalid/empty string.
 */
export function parseLocalDateOnly(dateStr: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!match) return null;
  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(date.getTime()) ? null : date;
}
