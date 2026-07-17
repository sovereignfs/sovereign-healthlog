'use client';

import { useState, useTransition } from 'react';
import { Button, ConfirmDialog } from '@sovereignfs/ui';
import { deleteMedicationSeries } from '../_lib/actions';

/** Deletes every version in the series, not just the current row — see the
 * action's own comment for why. */
export function DeleteMedicationButton({ seriesId, name }: { seriesId: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      await deleteMedicationSeries(seriesId);
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
        title="Delete this medication?"
        message={`Remove "${name}" and its full version history? This can't be undone.`}
        onConfirm={handleDelete}
        confirmLabel={pending ? 'Deleting…' : 'Delete'}
        destructive
        pending={pending}
      />
    </>
  );
}
