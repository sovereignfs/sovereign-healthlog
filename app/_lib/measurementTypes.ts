/** Kept out of actions.ts — a 'use server' file may only export async functions. */

export const FIXED_MEASUREMENT_TYPES = [
  'height',
  'weight',
  'blood_pressure',
  'heart_rate',
  'temperature',
  'glucose',
] as const;
export type FixedMeasurementType = (typeof FIXED_MEASUREMENT_TYPES)[number];

export const MEASUREMENT_TYPE_LABELS: Record<FixedMeasurementType, string> = {
  height: 'Height',
  weight: 'Weight',
  blood_pressure: 'Blood pressure',
  heart_rate: 'Heart rate',
  temperature: 'Temperature',
  glucose: 'Blood glucose',
};
