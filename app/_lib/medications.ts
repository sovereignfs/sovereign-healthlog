/** Kept out of actions.ts — a 'use server' file may only export async functions. */

export const MEDICATION_KINDS = ['medication', 'supplement', 'other'] as const;
export type MedicationKind = (typeof MEDICATION_KINDS)[number];

export const MEDICATION_KIND_LABELS: Record<MedicationKind, string> = {
  medication: 'Medication',
  supplement: 'Supplement',
  other: 'Other',
};

export type MedicationStatus = 'active' | 'ended' | 'archived';

export const MEDICATION_STATUSES: MedicationStatus[] = ['active', 'ended', 'archived'];

export const MEDICATION_STATUS_LABELS: Record<MedicationStatus, string> = {
  active: 'Active',
  ended: 'Ended',
  archived: 'Archived',
};

/**
 * HLG-32: status is derived, not a free user choice. `archived` is a
 * persisted, user-driven override (set via the archive action, carried
 * forward across dose/frequency versions). `ended` is purely computed from
 * `endDate` here, at read time — never stored — so it can't go stale
 * between edits the way a write-time-only computation would once the end
 * date passes with no further edit to re-trigger it. `active` is the
 * default when neither applies. String comparison on 'YYYY-MM-DD' values is
 * safe: the format is fixed-width and zero-padded, so lexicographic order
 * matches chronological order.
 */
export function computeEffectiveStatus(
  storedStatus: string,
  endDate: string | null,
  todayIso: string,
): MedicationStatus {
  if (storedStatus === 'archived') return 'archived';
  if (endDate && endDate < todayIso) return 'ended';
  return 'active';
}
