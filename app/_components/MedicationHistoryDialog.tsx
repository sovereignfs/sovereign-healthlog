'use client';

import { useEffect, useState } from 'react';
import { Button, Dialog } from '@sovereignfs/ui';
import type { MedicationVersion } from '../_lib/actions';
import { listMedicationVersions } from '../_lib/actions';
import { formatLocalDateOnly } from '../_lib/formUtils';
import styles from './MedicationHistoryDialog.module.css';

function formatCreatedAt(epochSeconds: number): string {
  return new Date(epochSeconds * 1000).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** Read-only — no separate detail route exists for medications (SPEC's
 * directory structure keeps medications on a single page), so history is a
 * dialog rather than a page. Only rendered when there's more than one
 * version to show. */
export function MedicationHistoryDialog({
  seriesId,
  versionCount,
}: {
  seriesId: string;
  versionCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [versions, setVersions] = useState<MedicationVersion[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    void listMedicationVersions(seriesId).then((result) => {
      setVersions(result);
      setLoading(false);
    });
  }, [open, seriesId]);

  if (versionCount <= 1) return null;

  return (
    <>
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)}>
        History ({versionCount})
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} size="md" title="Version history">
        {loading ? (
          <p className={styles.loading}>Loading…</p>
        ) : (
          <ul className={styles.list}>
            {versions.map((version) => (
              <li key={version.id} className={styles.item}>
                <div className={styles.itemHeader}>
                  <span className={styles.dose}>
                    {[version.dose, version.doseUnit].filter(Boolean).join(' ') || '—'}
                  </span>
                  <span className={styles.date}>{formatCreatedAt(version.createdAt)}</span>
                </div>
                {version.frequencyText && (
                  <div className={styles.frequency}>{version.frequencyText}</div>
                )}
                {(version.startDate || version.endDate) && (
                  <div className={styles.dates}>
                    {version.startDate ? formatLocalDateOnly(version.startDate) : '—'} –{' '}
                    {version.endDate ? formatLocalDateOnly(version.endDate) : 'ongoing'}
                  </div>
                )}
                {version.versionReason && (
                  <div className={styles.reason}>{version.versionReason}</div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Dialog>
    </>
  );
}
