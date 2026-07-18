import Link from 'next/link';
import { Button } from '@sovereignfs/ui';
import { BackLink } from '../../_components/BackLink';
import { PrintButton } from '../../_components/PrintButton';
import { getVisitSummaryData } from '../../_lib/actions';
import { formatLocalDateOnly, epochToLocalDateOnly } from '../../_lib/formUtils';
import { LAB_FLAG_LABELS, formatLabResultValue } from '../../_lib/labFormat';
import styles from './page.module.css';

/** Next 15's `searchParams` collapses a single repeated query key to a
 * plain string instead of a one-element array — normalize both shapes. */
function toArray(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function formatMeasurementValue(value: number, value2: number | null, unit: string): string {
  const rendered = value2 != null ? `${value}/${value2}` : `${value}`;
  return `${rendered} ${unit}`.trim();
}

function formatMedication(entry: {
  name: string;
  dose: string | null;
  doseUnit: string | null;
  frequencyText: string | null;
  route: string | null;
}): string {
  const parts = [entry.name, [entry.dose, entry.doseUnit].filter(Boolean).join(' '), entry.frequencyText, entry.route];
  return parts.filter(Boolean).join(' — ');
}

/**
 * HLG-52's printable/PDF-ready visit-summary view — the same data
 * (`getVisitSummaryData`) as the Markdown download, rendered as clean HTML
 * instead. "PDF via browser print in v0.1" (SPEC): no PDF library, just
 * `@media print` rules (`page.module.css`) hiding the nav/toolbar so the
 * browser's own print-to-PDF produces a clean document.
 */
export default async function VisitSummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ labGroupIds?: string | string[]; noteIds?: string | string[] }>;
}) {
  const params = await searchParams;
  const labGroupIds = toArray(params.labGroupIds);
  const noteIds = toArray(params.noteIds);
  const data = await getVisitSummaryData(labGroupIds, noteIds);

  const downloadHref = `/healthlog/exports/summary/download?${labGroupIds
    .map((id) => `labGroupIds=${encodeURIComponent(id)}`)
    .concat(noteIds.map((id) => `noteIds=${encodeURIComponent(id)}`))
    .join('&')}`;

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <BackLink href="/healthlog/exports">Back to Exports</BackLink>
        <div className={styles.toolbarActions}>
          <Link href={downloadHref}>
            <Button type="button">Download as Markdown</Button>
          </Link>
          <PrintButton />
        </div>
      </div>

      <article className={styles.summary}>
        <h1>Visit summary</h1>
        <p className={styles.meta}>Generated {epochToLocalDateOnly(data.generatedAt)}</p>
        {(data.displayName || data.dateOfBirth) && (
          <p className={styles.meta}>
            {data.displayName}
            {data.displayName && data.dateOfBirth ? ' · ' : ''}
            {data.dateOfBirth && `Born ${formatLocalDateOnly(data.dateOfBirth)}`}
          </p>
        )}
        <p className={styles.disclaimer}>Values are user-entered and not clinically verified.</p>

        <h2>Allergies</h2>
        <p>{data.allergies || 'None recorded.'}</p>

        <h2>Conditions</h2>
        <p>{data.conditions || 'None recorded.'}</p>

        <h2>Active medications</h2>
        {data.medications.length === 0 ? (
          <p>None.</p>
        ) : (
          <ul>
            {data.medications.map((med) => (
              <li key={med.id}>{formatMedication(med)}</li>
            ))}
          </ul>
        )}

        <h2>Recent measurements</h2>
        {data.measurements.length === 0 ? (
          <p>None recorded.</p>
        ) : (
          <ul>
            {data.measurements.map((m) => (
              <li key={m.type}>
                <strong>{m.label}:</strong> {formatMeasurementValue(m.value, m.value2, m.unit)} (
                {epochToLocalDateOnly(m.measuredAt)})
              </li>
            ))}
          </ul>
        )}

        <h2>Labs</h2>
        {data.labGroups.length === 0 ? (
          <p>None selected.</p>
        ) : (
          data.labGroups.map((group) => (
            <section key={group.id} className={styles.labGroup}>
              <h3>
                {group.title} — {formatLocalDateOnly(group.collectedAt)}
                {group.provider ? ` (${group.provider})` : ''}
              </h3>
              {group.results.length === 0 ? (
                <p>No results.</p>
              ) : (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Test</th>
                      <th>Value</th>
                      <th>Reference</th>
                      <th>Flag</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.results.map((result) => (
                      <tr key={result.id}>
                        <td>{result.testName}</td>
                        <td>{formatLabResultValue(result)}</td>
                        <td>
                          {result.referenceText ??
                            (result.referenceLow != null || result.referenceHigh != null
                              ? `${result.referenceLow ?? ''}–${result.referenceHigh ?? ''}`
                              : '')}
                        </td>
                        <td>{result.flag ? LAB_FLAG_LABELS[result.flag] : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          ))
        )}

        <h2>Notes</h2>
        {data.notes.length === 0 ? (
          <p>None selected.</p>
        ) : (
          data.notes.map((note) => (
            <section key={note.id} className={styles.note}>
              <h3>
                {note.title} — {epochToLocalDateOnly(note.notedAt)}
              </h3>
              <p>{note.body}</p>
            </section>
          ))
        )}
      </article>
    </div>
  );
}
