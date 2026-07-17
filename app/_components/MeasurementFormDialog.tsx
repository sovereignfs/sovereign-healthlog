'use client';

import { useActionState, useEffect, useState } from 'react';
import { Button, Dialog } from '@sovereignfs/ui';
import type { ActionResult, MeasurementEntry } from '../_lib/actions';
import { addMeasurement, updateMeasurement } from '../_lib/actions';
import type { PreferredUnits } from '../_lib/units';
import { MeasurementFormFields } from './MeasurementFormFields';
import styles from './MeasurementFormDialog.module.css';

/**
 * Both dialogs gate their form-owning child on `open` so the whole subtree
 * (and its `useActionState` call) unmounts on close — the simplest way to
 * discard a stale error/success state and reset uncontrolled defaults before
 * the next open, without a manual `formRef.reset()` + state-clearing dance.
 */

export function AddMeasurementDialog({
  preferredUnits,
  initialType,
}: {
  preferredUnits: PreferredUnits;
  initialType?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        + Add measurement
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} size="md" title="Add measurement">
        {open && (
          <AddMeasurementForm
            preferredUnits={preferredUnits}
            initialType={initialType}
            onClose={() => setOpen(false)}
          />
        )}
      </Dialog>
    </>
  );
}

function AddMeasurementForm({
  preferredUnits,
  initialType,
  onClose,
}: {
  preferredUnits: PreferredUnits;
  initialType?: string;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    addMeasurement,
    null,
  );

  useEffect(() => {
    if (state?.ok) onClose();
  }, [state, onClose]);

  return (
    <form action={formAction} className={styles.form}>
      {state && !state.ok && (
        <p className={styles.feedbackError} role="status" aria-live="polite">
          {state.error}
        </p>
      )}
      <MeasurementFormFields preferredUnits={preferredUnits} initialType={initialType} />
      <div className={styles.actions}>
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? 'Adding…' : 'Add measurement'}
        </Button>
      </div>
    </form>
  );
}

export function EditMeasurementDialog({
  entry,
  preferredUnits,
}: {
  entry: MeasurementEntry;
  preferredUnits: PreferredUnits;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)}>
        Edit
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} size="md" title="Edit measurement">
        {open && (
          <EditMeasurementForm
            entry={entry}
            preferredUnits={preferredUnits}
            onClose={() => setOpen(false)}
          />
        )}
      </Dialog>
    </>
  );
}

function EditMeasurementForm({
  entry,
  preferredUnits,
  onClose,
}: {
  entry: MeasurementEntry;
  preferredUnits: PreferredUnits;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    updateMeasurement,
    null,
  );

  useEffect(() => {
    if (state?.ok) onClose();
  }, [state, onClose]);

  return (
    <form action={formAction} className={styles.form}>
      <input type="hidden" name="id" value={entry.id} />
      {state && !state.ok && (
        <p className={styles.feedbackError} role="status" aria-live="polite">
          {state.error}
        </p>
      )}
      <MeasurementFormFields entry={entry} preferredUnits={preferredUnits} />
      <div className={styles.actions}>
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}
