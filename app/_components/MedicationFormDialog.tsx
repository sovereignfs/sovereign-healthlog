'use client';

import { useActionState, useEffect, useState } from 'react';
import { Button, Dialog } from '@sovereignfs/ui';
import type { ActionResult, MedicationEntry } from '../_lib/actions';
import { addMedication, updateMedication } from '../_lib/actions';
import { MedicationFormFields } from './MedicationFormFields';
import styles from './MeasurementFormDialog.module.css';

/** Same open-gated-child pattern as MeasurementFormDialog — see its comment. */

export function AddMedicationDialog() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        + Add medication
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} size="md" title="Add medication">
        {open && <AddMedicationForm onClose={() => setOpen(false)} />}
      </Dialog>
    </>
  );
}

function AddMedicationForm({ onClose }: { onClose: () => void }) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    addMedication,
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
      <MedicationFormFields />
      <div className={styles.actions}>
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? 'Adding…' : 'Add medication'}
        </Button>
      </div>
    </form>
  );
}

export function EditMedicationDialog({ entry }: { entry: MedicationEntry }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Edit
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} size="md" title="Edit medication">
        {open && <EditMedicationForm entry={entry} onClose={() => setOpen(false)} />}
      </Dialog>
    </>
  );
}

function EditMedicationForm({
  entry,
  onClose,
}: {
  entry: MedicationEntry;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    updateMedication,
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
      <MedicationFormFields entry={entry} />
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
