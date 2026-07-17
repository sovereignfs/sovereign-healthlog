'use client';

import { useTransition } from 'react';
import { Button } from '@sovereignfs/ui';
import { setMedicationArchived } from '../_lib/actions';

export function ToggleMedicationArchivedButton({
  id,
  archived,
}: {
  id: string;
  archived: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function handleToggle() {
    startTransition(async () => {
      await setMedicationArchived(id, !archived);
    });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleToggle}
      disabled={pending}
      aria-pressed={archived}
    >
      {archived ? 'Unarchive' : 'Archive'}
    </Button>
  );
}
