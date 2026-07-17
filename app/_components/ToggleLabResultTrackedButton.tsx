'use client';

import { useTransition } from 'react';
import { Button } from '@sovereignfs/ui';
import { setLabResultTracked } from '../_lib/actions';

export function ToggleLabResultTrackedButton({
  id,
  groupId,
  tracked,
}: {
  id: string;
  groupId: string;
  tracked: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function handleToggle() {
    startTransition(async () => {
      await setLabResultTracked(id, groupId, !tracked);
    });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleToggle}
      disabled={pending}
      aria-pressed={tracked}
    >
      {tracked ? '★ Tracked' : '☆ Track'}
    </Button>
  );
}
