'use client';

import { useEffect, useState } from 'react';
import { Card, EmptyState, Tabs } from '@sovereignfs/ui';
import type { TabItem } from '@sovereignfs/ui';
import type { MeasurementEntry } from '../_lib/actions';
import { FIXED_MEASUREMENT_TYPES, MEASUREMENT_TYPE_LABELS } from '../_lib/measurementTypes';
import type { PreferredUnits } from '../_lib/units';
import { AddMeasurementDialog, EditMeasurementDialog } from './MeasurementFormDialog';
import { DeleteMeasurementButton } from './DeleteMeasurementButton';
import styles from './MeasurementsView.module.css';

function formatDateTime(epochSeconds: number): string {
  return new Date(epochSeconds * 1000).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatValue(entry: MeasurementEntry): string {
  if (entry.type === 'blood_pressure' && entry.value2 != null) {
    return `${entry.value}/${entry.value2} ${entry.unit}`;
  }
  return `${entry.value} ${entry.unit}`;
}

function typeLabel(type: string): string {
  return (MEASUREMENT_TYPE_LABELS as Record<string, string>)[type] ?? type;
}

export function MeasurementsView({
  entriesByType,
  customTypes,
  preferredUnits,
}: {
  entriesByType: Record<string, MeasurementEntry[]>;
  customTypes: string[];
  preferredUnits: PreferredUnits;
}) {
  const tabItems: TabItem[] = [
    ...FIXED_MEASUREMENT_TYPES.map((type) => ({ label: MEASUREMENT_TYPE_LABELS[type], value: type })),
    ...customTypes.map((type) => ({ label: type, value: type })),
  ];
  const [selected, setSelected] = useState<string>(tabItems[0]?.value ?? 'weight');

  // A custom type's tab disappears once its last entry is deleted (it's derived
  // from `customTypes`, not a persisted list) — fall back to the first
  // remaining tab rather than leaving the view stuck on a tab that no longer
  // exists, with nothing shown as selected and no entries to show.
  useEffect(() => {
    if (!tabItems.some((item) => item.value === selected)) {
      setSelected(tabItems[0]?.value ?? 'weight');
    }
  });

  const entries = entriesByType[selected] ?? [];
  const [latest, previous] = entries;
  const label = typeLabel(selected);

  return (
    <div className={styles.view}>
      <div className={styles.toolbar}>
        <Tabs items={tabItems} value={selected} onChange={setSelected} aria-label="Measurement type" />
        <AddMeasurementDialog preferredUnits={preferredUnits} initialType={selected} />
      </div>

      {entries.length === 0 || !latest ? (
        <EmptyState
          icon="activity"
          heading={`No ${label.toLowerCase()} entries yet`}
          description="Add your first entry to start a history."
        />
      ) : (
        <>
          <div className={styles.summary}>
            <Card padding="sm" className={styles.summaryCard}>
              <span className={styles.summaryLabel}>Latest</span>
              <span className={styles.summaryValue}>{formatValue(latest)}</span>
              <span className={styles.summaryDate}>{formatDateTime(latest.measuredAt)}</span>
            </Card>
            {previous && (
              <Card padding="sm" className={styles.summaryCard}>
                <span className={styles.summaryLabel}>Previous</span>
                <span className={styles.summaryValue}>{formatValue(previous)}</span>
                <span className={styles.summaryDate}>{formatDateTime(previous.measuredAt)}</span>
              </Card>
            )}
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Value</th>
                  <th>Context</th>
                  <th>Note</th>
                  <th className={styles.actionsHeader}>
                    <span className={styles.srOnly}>Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td>{formatDateTime(entry.measuredAt)}</td>
                    <td>{formatValue(entry)}</td>
                    <td>{entry.context ?? '—'}</td>
                    <td>{entry.note ?? '—'}</td>
                    <td className={styles.rowActions}>
                      <EditMeasurementDialog entry={entry} preferredUnits={preferredUnits} />
                      <DeleteMeasurementButton id={entry.id} label={label.toLowerCase()} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
