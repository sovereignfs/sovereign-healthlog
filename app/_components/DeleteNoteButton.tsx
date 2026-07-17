'use client';

import { useState, useTransition } from 'react';
import { Button, ConfirmDialog } from '@sovereignfs/ui';
import { deleteNote } from '../_lib/actions';

export function DeleteNoteButton({ id, title }: { id: string; title: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      await deleteNote(id);
      setOpen(false);
    });
  }

  return (
    <>
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)}>
        Delete
      </Button>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Delete this note?"
        message={`Remove "${title}"? This can't be undone.`}
        onConfirm={handleDelete}
        confirmLabel={pending ? 'Deleting…' : 'Delete'}
        destructive
        pending={pending}
      />
    </>
  );
}
