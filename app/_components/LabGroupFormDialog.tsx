'use client';

import { useActionState, useEffect, useState } from 'react';
import { Button, Dialog } from '@sovereignfs/ui';
import type { ActionResult, LabGroupDetail } from '../_lib/actions';
import { addLabGroup, updateLabGroup } from '../_lib/actions';
import { LabGroupFormFields } from './LabGroupFormFields';
import styles from './MeasurementFormDialog.module.css';

/** Same open-gated-child pattern as MeasurementFormDialog — see its comment. */

export function AddLabGroupDialog() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        + Add lab group
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} size="md" title="Add lab group">
        {open && <AddLabGroupForm onClose={() => setOpen(false)} />}
      </Dialog>
    </>
  );
}

function AddLabGroupForm({ onClose }: { onClose: () => void }) {
  // addLabGroup redirects to the new group's detail page on success — it
  // never returns { ok: true }, so there's no success branch to react to
  // here; the redirect itself is what "closes" this dialog.
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    addLabGroup,
    null,
  );

  return (
    <form action={formAction} className={styles.form}>
      {state && !state.ok && (
        <p className={styles.feedbackError} role="status" aria-live="polite">
          {state.error}
        </p>
      )}
      <LabGroupFormFields />
      <div className={styles.actions}>
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? 'Adding…' : 'Add lab group'}
        </Button>
      </div>
    </form>
  );
}

export function EditLabGroupDialog({ group }: { group: LabGroupDetail }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        Edit
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} size="md" title="Edit lab group">
        {open && <EditLabGroupForm group={group} onClose={() => setOpen(false)} />}
      </Dialog>
    </>
  );
}

function EditLabGroupForm({ group, onClose }: { group: LabGroupDetail; onClose: () => void }) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    updateLabGroup,
    null,
  );

  useEffect(() => {
    if (state?.ok) onClose();
  }, [state, onClose]);

  return (
    <form action={formAction} className={styles.form}>
      <input type="hidden" name="id" value={group.id} />
      {state && !state.ok && (
        <p className={styles.feedbackError} role="status" aria-live="polite">
          {state.error}
        </p>
      )}
      <LabGroupFormFields group={group} />
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
