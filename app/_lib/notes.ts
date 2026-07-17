/** Kept out of actions.ts — a 'use server' file may only export async functions. */

export const NOTE_CATEGORIES = [
  'general',
  'symptom',
  'appointment',
  'lifestyle',
  'medication',
  'lab',
  'other',
] as const;
export type NoteCategory = (typeof NOTE_CATEGORIES)[number];

export const NOTE_CATEGORY_LABELS: Record<NoteCategory, string> = {
  general: 'General',
  symptom: 'Symptom',
  appointment: 'Appointment',
  lifestyle: 'Lifestyle',
  medication: 'Medication',
  lab: 'Lab',
  other: 'Other',
};

/** HLG-41's three linkable record types. */
export const NOTE_LINK_TYPES = ['measurement', 'lab_group', 'medication'] as const;
export type NoteLinkType = (typeof NOTE_LINK_TYPES)[number];

export const NOTE_LINK_TYPE_LABELS: Record<NoteLinkType, string> = {
  measurement: 'Measurement',
  lab_group: 'Lab group',
  medication: 'Medication',
};
