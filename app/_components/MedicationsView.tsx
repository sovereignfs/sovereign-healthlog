'use client';

import { useState } from 'react';
import { Badge, Card, EmptyState, Tabs } from '@sovereignfs/ui';
import type { TabItem } from '@sovereignfs/ui';
import type { MedicationEntry } from '../_lib/actions';
import { formatLocalDateOnly } from '../_lib/formUtils';
import type { MedicationStatus } from '../_lib/medications';
import { MEDICATION_KIND_LABELS, MEDICATION_STATUSES, MEDICATION_STATUS_LABELS } from '../_lib/medications';
import { AddMedicationDialog, EditMedicationDialog } from './MedicationFormDialog';
import { DeleteMedicationButton } from './DeleteMedicationButton';
import { MedicationHistoryDialog } from './MedicationHistoryDialog';
import { ToggleMedicationArchivedButton } from './ToggleMedicationArchivedButton';
import styles from './MedicationsView.module.css';

const EMPTY_STATE_COPY: Record<MedicationStatus, { heading: string; description: string }> = {
  active: {
    heading: 'No active medications',
    description: 'Add a medication or supplement you take regularly.',
  },
  ended: {
    heading: 'No ended medications',
    description: 'Medications with a past end date show up here.',
  },
  archived: {
    heading: 'No archived medications',
    description: 'Archive a medication you no longer want on your active list.',
  },
};

export function MedicationsView({ medications }: { medications: MedicationEntry[] }) {
  const [selected, setSelected] = useState<MedicationStatus>('active');

  const tabItems: TabItem[] = MEDICATION_STATUSES.map((status) => ({
    label: `${MEDICATION_STATUS_LABELS[status]} (${medications.filter((m) => m.effectiveStatus === status).length})`,
    value: status,
  }));

  const filtered = medications.filter((m) => m.effectiveStatus === selected);
  const empty = EMPTY_STATE_COPY[selected];

  return (
    <div className={styles.view}>
      <div className={styles.toolbar}>
        <Tabs
          items={tabItems}
          value={selected}
          onChange={(value) => setSelected(value as MedicationStatus)}
          aria-label="Medication status"
        />
        <AddMedicationDialog />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="shield" heading={empty.heading} description={empty.description} />
      ) : (
        <div className={styles.list}>
          {filtered.map((medication) => (
            <Card key={medication.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.titleRow}>
                  <h2 className={styles.name}>{medication.name}</h2>
                  <Badge>{MEDICATION_KIND_LABELS[medication.kind]}</Badge>
                </div>
                <div className={styles.cardActions}>
                  <EditMedicationDialog entry={medication} />
                  <ToggleMedicationArchivedButton
                    id={medication.id}
                    archived={medication.effectiveStatus === 'archived'}
                  />
                  <DeleteMedicationButton seriesId={medication.seriesId} name={medication.name} />
                </div>
              </div>

              {(medication.dose || medication.doseUnit || medication.route || medication.frequencyText) && (
                <div className={styles.details}>
                  {(medication.dose || medication.doseUnit) && (
                    <span>{[medication.dose, medication.doseUnit].filter(Boolean).join(' ')}</span>
                  )}
                  {medication.route && <span>{medication.route}</span>}
                  {medication.frequencyText && <span>{medication.frequencyText}</span>}
                </div>
              )}

              {(medication.startDate || medication.endDate) && (
                <div className={styles.dates}>
                  {medication.startDate ? formatLocalDateOnly(medication.startDate) : '—'} –{' '}
                  {medication.endDate ? formatLocalDateOnly(medication.endDate) : 'ongoing'}
                </div>
              )}

              {(medication.prescribingClinician || medication.pharmacy) && (
                <div className={styles.meta}>
                  {medication.prescribingClinician && <span>{medication.prescribingClinician}</span>}
                  {medication.pharmacy && <span>{medication.pharmacy}</span>}
                </div>
              )}

              {medication.notes && <p className={styles.notes}>{medication.notes}</p>}

              <MedicationHistoryDialog
                seriesId={medication.seriesId}
                versionCount={medication.versionCount}
              />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
