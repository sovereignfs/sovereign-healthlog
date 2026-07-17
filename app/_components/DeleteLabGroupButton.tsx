'use client';

import { useState, useTransition } from 'react';
import { Button, ConfirmDialog } from '@sovereignfs/ui';
import { deleteLabGroup } from '../_lib/actions';

/** deleteLabGroup redirects to /healthlog/labs on success, so there's no
 * local "done" state to reach here — the page navigates away underneath. */
export function DeleteLabGroupButton({ id, title }: { id: string; title: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      await deleteLabGroup(id);
    });
  }

  return (
    <>
      <Button type="button" variant="destructive" onClick={() => setOpen(true)}>
        Delete
      </Button>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Delete this lab group?"
        message={`Remove "${title}" and all its results? This can't be undone.`}
        onConfirm={handleDelete}
        confirmLabel={pending ? 'Deleting…' : 'Delete'}
        destructive
        pending={pending}
      />
    </>
  );
}
