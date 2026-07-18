/** Kept out of actions.ts — a 'use server' file may only export async functions. */

import type { LabResultEntry, MedicationEntry, NoteEntry } from './actions';
import { epochToLocalDateOnly, formatLocalDateOnly } from './formUtils';
import { LAB_FLAG_LABELS, formatLabResultValue } from './labFormat';

export interface VisitSummaryMeasurement {
  type: string;
  label: string;
  value: number;
  value2: number | null;
  unit: string;
  measuredAt: number;
}

export interface VisitSummaryLabGroup {
  id: string;
  title: string;
  collectedAt: string;
  provider: string | null;
  results: LabResultEntry[];
}

export interface VisitSummaryData {
  generatedAt: number;
  displayName: string;
  dateOfBirth: string;
  allergies: string;
  conditions: string;
  medications: MedicationEntry[];
  measurements: VisitSummaryMeasurement[];
  labGroups: VisitSummaryLabGroup[];
  notes: NoteEntry[];
}

function formatMeasurementValue(entry: VisitSummaryMeasurement): string {
  const value =
    entry.type === 'blood_pressure' && entry.value2 != null
      ? `${entry.value}/${entry.value2}`
      : `${entry.value}`;
  return `${value} ${entry.unit}`.trim();
}

function formatMedication(entry: MedicationEntry): string {
  const parts: string[] = [entry.name];
  const dose = [entry.dose, entry.doseUnit].filter(Boolean).join(' ');
  if (dose) parts.push(dose);
  if (entry.frequencyText) parts.push(entry.frequencyText);
  if (entry.route) parts.push(entry.route);
  return parts.join(' — ');
}

function formatReferenceRange(result: LabResultEntry): string {
  if (result.referenceText) return result.referenceText;
  if (result.referenceLow != null || result.referenceHigh != null) {
    return `${result.referenceLow ?? ''}–${result.referenceHigh ?? ''}`;
  }
  return '';
}

/**
 * Builds the visit-summary packet as Markdown (HLG-52). Also used, verbatim,
 * as the source for the printable HTML view (`app/exports/summary/page.tsx`
 * renders the same sections directly, not this string) — this function is
 * the download format specifically.
 */
export function buildVisitSummaryMarkdown(data: VisitSummaryData): string {
  const lines: string[] = ['# Visit summary', ''];
  lines.push(`Generated ${epochToLocalDateOnly(data.generatedAt)}`);
  if (data.displayName) lines.push(`**Name:** ${data.displayName}`);
  if (data.dateOfBirth) lines.push(`**Date of birth:** ${formatLocalDateOnly(data.dateOfBirth)}`);
  lines.push('');
  lines.push('_Values are user-entered and not clinically verified._');

  lines.push('', '## Allergies', data.allergies || '_None recorded._');
  lines.push('', '## Conditions', data.conditions || '_None recorded._');

  lines.push('', '## Active medications');
  lines.push(
    ...(data.medications.length === 0
      ? ['_None._']
      : data.medications.map((med) => `- ${formatMedication(med)}`)),
  );

  lines.push('', '## Recent measurements');
  lines.push(
    ...(data.measurements.length === 0
      ? ['_None recorded._']
      : data.measurements.map(
          (m) => `- **${m.label}:** ${formatMeasurementValue(m)} (${epochToLocalDateOnly(m.measuredAt)})`,
        )),
  );

  lines.push('', '## Labs');
  if (data.labGroups.length === 0) {
    lines.push('_None selected._');
  } else {
    for (const group of data.labGroups) {
      const heading = [group.title, formatLocalDateOnly(group.collectedAt), group.provider]
        .filter(Boolean)
        .join(' · ');
      lines.push('', `### ${heading}`);
      if (group.results.length === 0) {
        lines.push('_No results._');
      } else {
        lines.push('', '| Test | Value | Reference | Flag |', '| --- | --- | --- | --- |');
        for (const result of group.results) {
          lines.push(
            `| ${result.testName} | ${formatLabResultValue(result)} | ${formatReferenceRange(result)} | ${result.flag ? LAB_FLAG_LABELS[result.flag] : ''} |`,
          );
        }
      }
    }
  }

  lines.push('', '## Notes');
  if (data.notes.length === 0) {
    lines.push('_None selected._');
  } else {
    for (const note of data.notes) {
      lines.push('', `### ${note.title} — ${epochToLocalDateOnly(note.notedAt)}`, note.body);
    }
  }

  return lines.join('\n');
}
