'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { Button, FormField, Input, Select } from '@sovereignfs/ui';
import type { ActionResult, HeightEntry } from '../_lib/actions';
import { addHeightEntry } from '../_lib/actions';
import type { PreferredUnits } from '../_lib/units';
import styles from './HeightSection.module.css';

function formatDate(epochSeconds: number): string {
  return new Date(epochSeconds * 1000).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** Local (not UTC) 'YYYY-MM-DD' for today — `toISOString()` converts to UTC
 * first, which can show the wrong default date near midnight in some
 * timezones. */
function todayLocalDateInputValue(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function HeightSection({
  entries,
  preferredHeightUnit,
}: {
  entries: HeightEntry[];
  preferredHeightUnit: PreferredUnits['height'];
}) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    addHeightEntry,
    null,
  );
  const current = entries[0] ?? null;
  const history = entries.slice(1);

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.sectionTitle}>Height</h2>
        <Link href="/healthlog/measurements" className={styles.historyLink}>
          Full history →
        </Link>
      </div>

      <div className={styles.current}>
        {current ? (
          <>
            <span className={styles.currentValue}>
              {current.value} {current.unit}
            </span>
            <span className={styles.currentDate}>as of {formatDate(current.measuredAt)}</span>
          </>
        ) : (
          <span className={styles.currentEmpty}>No height recorded yet.</span>
        )}
      </div>

      {history.length > 0 && (
        <ul className={styles.history}>
          {history.map((entry) => (
            <li key={entry.id} className={styles.historyRow}>
              <span>
                {entry.value} {entry.unit}
              </span>
              <span className={styles.historyDate}>{formatDate(entry.measuredAt)}</span>
            </li>
          ))}
        </ul>
      )}

      <form action={formAction} className={styles.form}>
        {state && !state.ok && (
          <p className={styles.feedbackError} role="status" aria-live="polite">
            {state.error}
          </p>
        )}
        <div className={styles.formRow}>
          <FormField label="Height" className={styles.valueField}>
            {(field) => (
              <Input {...field} name="value" type="number" step="0.1" min="0" required />
            )}
          </FormField>
          <FormField label="Unit" className={styles.unitField}>
            {(field) => (
              <Select {...field} name="unit" defaultValue={preferredHeightUnit}>
                <option value="cm">cm</option>
                <option value="in">in</option>
              </Select>
            )}
          </FormField>
          <FormField label="Date" className={styles.dateField}>
            {(field) => (
              <Input
                {...field}
                name="measuredAt"
                type="date"
                defaultValue={todayLocalDateInputValue()}
              />
            )}
          </FormField>
          <Button type="submit" disabled={pending} size="sm" className={styles.submit}>
            {pending ? 'Adding…' : 'Add entry'}
          </Button>
        </div>
      </form>
    </section>
  );
}
