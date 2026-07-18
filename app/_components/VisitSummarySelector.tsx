'use client';

import { useState } from 'react';
import { Checkbox, EmptyState } from '@sovereignfs/ui';
import type { LabGroupSummary, NoteEntry } from '../_lib/actions';
import { formatLocalDateOnly } from '../_lib/formUtils';
import styles from './VisitSummarySelector.module.css';

/**
 * Selection UI for HLG-52's visit summary — a plain GET form (no client
 * fetch/submit handling) so the whole builder stays a server-rendered page.
 * `Checkbox` forwards unknown props to its native input (`CheckboxProps`
 * extends `InputHTMLAttributes`), so passing `name`/`value` here makes each
 * checked box submit as an ordinary `labGroupIds=<id>` / `noteIds=<id>` pair
 * on form submit — no hidden-input mirroring needed, unlike a single boolean
 * field (e.g. `LabResultFormFields`'s "tracked" checkbox).
 */
export function VisitSummarySelector({
  labGroups,
  notes,
}: {
  labGroups: LabGroupSummary[];
  notes: NoteEntry[];
}) {
  const [checkedLabGroups, setCheckedLabGroups] = useState<Set<string>>(new Set());
  const [checkedNotes, setCheckedNotes] = useState<Set<string>>(new Set());

  function toggle(set: Set<string>, setSet: (next: Set<string>) => void, id: string, checked: boolean) {
    const next = new Set(set);
    if (checked) next.add(id);
    else next.delete(id);
    setSet(next);
  }

  return (
    <div className={styles.root}>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Labs</h2>
        {labGroups.length === 0 ? (
          <EmptyState heading="No lab groups yet" />
        ) : (
          <ul className={styles.list}>
            {labGroups.map((group) => (
              <li key={group.id} className={styles.row}>
                <Checkbox
                  name="labGroupIds"
                  value={group.id}
                  checked={checkedLabGroups.has(group.id)}
                  onChange={(checked) =>
                    toggle(checkedLabGroups, setCheckedLabGroups, group.id, checked)
                  }
                  label={`${group.title} — ${formatLocalDateOnly(group.collectedAt)}`}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Notes</h2>
        {notes.length === 0 ? (
          <EmptyState heading="No notes yet" />
        ) : (
          <ul className={styles.list}>
            {notes.map((note) => (
              <li key={note.id} className={styles.row}>
                <Checkbox
                  name="noteIds"
                  value={note.id}
                  checked={checkedNotes.has(note.id)}
                  onChange={(checked) => toggle(checkedNotes, setCheckedNotes, note.id, checked)}
                  label={note.title}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
