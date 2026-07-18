import Link from 'next/link';
import { Badge, Card } from '@sovereignfs/ui';
import type { DashboardMeasurement, DashboardSummary } from '../_lib/actions';
import { formatLocalDateOnly } from '../_lib/formUtils';
import { MEDICATION_KIND_LABELS } from '../_lib/medications';
import { NOTE_CATEGORY_LABELS } from '../_lib/notes';
import type { PreferredUnits } from '../_lib/units';
import { AddLabGroupDialog } from './LabGroupFormDialog';
import { AddMeasurementDialog } from './MeasurementFormDialog';
import { AddMedicationDialog } from './MedicationFormDialog';
import { AddNoteDialog } from './NoteFormDialog';
import styles from './Dashboard.module.css';

function formatDate(epochSeconds: number): string {
  return new Date(epochSeconds * 1000).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatMeasurementValue(measurement: DashboardMeasurement): string {
  return measurement.value2 != null
    ? `${measurement.value}/${measurement.value2} ${measurement.unit}`
    : `${measurement.value} ${measurement.unit}`;
}

function SummaryCard({ label, measurement }: { label: string; measurement: DashboardMeasurement | null }) {
  return (
    <Link href="/healthlog/measurements" className={styles.cardLink}>
      {/* Card's own `interactive` variant sets `display: block` in its base
          CSS module — composing a second class for `display: flex` on the
          same element is a coin flip on which one wins (both are single-
          class selectors; it comes down to CSS Module bundle order, not
          source order in this file). Laying out the flex column on an
          inner wrapper instead of the Card element itself sidesteps that
          entirely. */}
      <Card padding="sm" interactive>
        <div className={styles.summaryCard}>
          <span className={styles.cardLabel}>{label}</span>
          <span className={styles.cardValue}>
            {measurement ? formatMeasurementValue(measurement) : 'Not recorded'}
          </span>
          {measurement && <span className={styles.cardDate}>{formatDate(measurement.measuredAt)}</span>}
        </div>
      </Card>
    </Link>
  );
}

export function Dashboard({
  summary,
  preferredUnits,
}: {
  summary: DashboardSummary;
  preferredUnits: PreferredUnits;
}) {
  return (
    <div className={styles.dashboard}>
      <div className={styles.quickAdd}>
        <AddMeasurementDialog preferredUnits={preferredUnits} initialType="weight" />
        <AddLabGroupDialog />
        <AddMedicationDialog />
        <AddNoteDialog />
      </div>

      <div className={styles.summaryGrid}>
        <SummaryCard label="Height" measurement={summary.currentHeight} />
        <SummaryCard label="Weight" measurement={summary.latestWeight} />
        <SummaryCard label="Blood pressure" measurement={summary.latestBloodPressure} />
      </div>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Active medications</h2>
          <Link href="/healthlog/medications" className={styles.sectionLink}>
            View all →
          </Link>
        </div>
        {summary.activeMedications.length === 0 ? (
          <p className={styles.emptyHint}>No active medications.</p>
        ) : (
          <ul className={styles.list}>
            {summary.activeMedications.map((medication) => (
              <li key={medication.id} className={styles.listRow}>
                <span className={styles.listPrimary}>{medication.name}</span>
                <span className={styles.listMeta}>
                  {[medication.dose, medication.doseUnit].filter(Boolean).join(' ') ||
                    MEDICATION_KIND_LABELS[medication.kind]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Recent labs</h2>
          <Link href="/healthlog/labs" className={styles.sectionLink}>
            View all →
          </Link>
        </div>
        {summary.recentLabGroups.length === 0 ? (
          <p className={styles.emptyHint}>No lab groups yet.</p>
        ) : (
          <ul className={styles.list}>
            {summary.recentLabGroups.map((group) => (
              <li key={group.id} className={styles.listRow}>
                <Link href={`/healthlog/labs/${group.id}`} className={styles.listPrimary}>
                  {group.title}
                </Link>
                <span className={styles.listMeta}>{formatLocalDateOnly(group.collectedAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Recent notes</h2>
          <Link href="/healthlog/notes" className={styles.sectionLink}>
            View all →
          </Link>
        </div>
        {summary.recentNotes.length === 0 ? (
          <p className={styles.emptyHint}>No notes yet.</p>
        ) : (
          <ul className={styles.list}>
            {summary.recentNotes.map((note) => (
              <li key={note.id} className={styles.listRow}>
                <span className={styles.listPrimary}>{note.title}</span>
                <Badge>{NOTE_CATEGORY_LABELS[note.category]}</Badge>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
