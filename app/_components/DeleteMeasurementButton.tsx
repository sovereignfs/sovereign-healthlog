'use client';

import { useState, useTransition } from 'react';
import { Button, ConfirmDialog } from '@sovereignfs/ui';
import { deleteMeasurement } from '../_lib/actions';

export function DeleteMeasurementButton({ id, label }: { id: string; label: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      await deleteMeasurement(id);
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
        title="Delete this entry?"
        message={`Remove this ${label} entry? This can't be undone.`}
        onConfirm={handleDelete}
        confirmLabel={pending ? 'Deleting…' : 'Delete'}
        destructive
        pending={pending}
      />
    </>
  );
}
