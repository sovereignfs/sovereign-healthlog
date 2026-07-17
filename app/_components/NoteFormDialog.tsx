'use client';

import { useActionState, useEffect, useState } from 'react';
import { Button, Dialog } from '@sovereignfs/ui';
import type { ActionResult, NoteEntry } from '../_lib/actions';
import { addNote, updateNote } from '../_lib/actions';
import { NoteFormFields } from './NoteFormFields';
import styles from './MeasurementFormDialog.module.css';

/** Same open-gated-child pattern as MeasurementFormDialog — see its comment. */

export function AddNoteDialog() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        + Add note
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} size="md" title="Add note">
        {open && <AddNoteForm onClose={() => setOpen(false)} />}
      </Dialog>
    </>
  );
}

function AddNoteForm({ onClose }: { onClose: () => void }) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    addNote,
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
      <NoteFormFields />
      <div className={styles.actions}>
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? 'Adding…' : 'Add note'}
        </Button>
      </div>
    </form>
  );
}

export function EditNoteDialog({ entry }: { entry: NoteEntry }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Edit
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} size="md" title="Edit note">
        {open && <EditNoteForm entry={entry} onClose={() => setOpen(false)} />}
      </Dialog>
    </>
  );
}

function EditNoteForm({ entry, onClose }: { entry: NoteEntry; onClose: () => void }) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    updateNote,
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
      <NoteFormFields entry={entry} />
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
