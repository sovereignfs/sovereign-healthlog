/** Kept out of actions.ts — a 'use server' file may only export async functions. */

export type LabValueKind = 'numeric' | 'text' | 'positive_negative' | 'detected_not_detected';
export type LabFlag = 'low' | 'high' | 'critical' | 'abnormal';

export const LAB_VALUE_KINDS: LabValueKind[] = [
  'numeric',
  'text',
  'positive_negative',
  'detected_not_detected',
];

export const LAB_VALUE_KIND_LABELS: Record<LabValueKind, string> = {
  numeric: 'Numeric',
  text: 'Text',
  positive_negative: 'Positive / negative',
  detected_not_detected: 'Detected / not detected',
};

export const LAB_FLAG_LABELS: Record<LabFlag, string> = {
  low: 'Low',
  high: 'High',
  critical: 'Critical',
  abnormal: 'Abnormal',
};

interface LabResultValueFields {
  valueKind: string;
  numericValue: number | null;
  textValue: string | null;
  unit: string | null;
}

/** Renders a lab result's value across all four HLG-22 value shapes. */
export function formatLabResultValue(entry: LabResultValueFields): string {
  switch (entry.valueKind) {
    case 'numeric':
      return entry.numericValue == null
        ? '—'
        : `${entry.numericValue}${entry.unit ? ` ${entry.unit}` : ''}`;
    case 'text':
      return entry.textValue ?? '—';
    case 'positive_negative':
      if (entry.textValue === 'positive') return 'Positive';
      if (entry.textValue === 'negative') return 'Negative';
      return '—';
    case 'detected_not_detected':
      if (entry.textValue === 'detected') return 'Detected';
      if (entry.textValue === 'not_detected') return 'Not detected';
      return '—';
    default:
      return '—';
  }
}
