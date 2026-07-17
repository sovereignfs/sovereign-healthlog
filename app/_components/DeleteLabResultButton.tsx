'use client';

import { useState, useTransition } from 'react';
import { Button, ConfirmDialog } from '@sovereignfs/ui';
import { deleteLabResult } from '../_lib/actions';

export function DeleteLabResultButton({
  id,
  groupId,
  testName,
}: {
  id: string;
  groupId: string;
  testName: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      await deleteLabResult(id, groupId);
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
        title="Delete this result?"
        message={`Remove "${testName}" from this lab group? This can't be undone.`}
        onConfirm={handleDelete}
        confirmLabel={pending ? 'Deleting…' : 'Delete'}
        destructive
        pending={pending}
      />
    </>
  );
}
