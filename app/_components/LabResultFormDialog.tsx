'use client';

import { useActionState, useEffect, useState } from 'react';
import { Button, Dialog } from '@sovereignfs/ui';
import type { ActionResult, LabResultEntry } from '../_lib/actions';
import { addLabResult, updateLabResult } from '../_lib/actions';
import { LabResultFormFields } from './LabResultFormFields';
import styles from './MeasurementFormDialog.module.css';

/** Same open-gated-child pattern as MeasurementFormDialog — see its comment. */

export function AddLabResultDialog({ groupId }: { groupId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        + Add result
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} size="md" title="Add lab result">
        {open && <AddLabResultForm groupId={groupId} onClose={() => setOpen(false)} />}
      </Dialog>
    </>
  );
}

function AddLabResultForm({ groupId, onClose }: { groupId: string; onClose: () => void }) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    addLabResult,
    null,
  );

  useEffect(() => {
    if (state?.ok) onClose();
  }, [state, onClose]);

  return (
    <form action={formAction} className={styles.form}>
      <input type="hidden" name="groupId" value={groupId} />
      {state && !state.ok && (
        <p className={styles.feedbackError} role="status" aria-live="polite">
          {state.error}
        </p>
      )}
      <LabResultFormFields />
      <div className={styles.actions}>
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? 'Adding…' : 'Add result'}
        </Button>
      </div>
    </form>
  );
}

export function EditLabResultDialog({ entry }: { entry: LabResultEntry }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)}>
        Edit
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} size="md" title="Edit lab result">
        {open && <EditLabResultForm entry={entry} onClose={() => setOpen(false)} />}
      </Dialog>
    </>
  );
}

function EditLabResultForm({ entry, onClose }: { entry: LabResultEntry; onClose: () => void }) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    updateLabResult,
    null,
  );

  useEffect(() => {
    if (state?.ok) onClose();
  }, [state, onClose]);

  return (
    <form action={formAction} className={styles.form}>
      <input type="hidden" name="id" value={entry.id} />
      <input type="hidden" name="groupId" value={entry.groupId} />
      {state && !state.ok && (
        <p className={styles.feedbackError} role="status" aria-live="polite">
          {state.error}
        </p>
      )}
      <LabResultFormFields entry={entry} />
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
