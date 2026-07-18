import { sdk } from '@sovereignfs/sdk';
import type { ActivityLogEntry } from '@sovereignfs/sdk';

/**
 * Records a HealthLog activity event (HL-12, SPEC's "Audit metadata" note:
 * export/share activity can remain in platform activity history, but must
 * never include health record contents). Best-effort — mirrors
 * `sovereign-plainwrite`'s own `recordActivity`: a logging failure must
 * never block the export/summary action that triggered it.
 *
 * Callers must keep `summary`/`metadata` to counts and format choices only
 * — never test names, note titles/bodies, medication names, or values.
 */
export async function recordActivity(entry: ActivityLogEntry): Promise<void> {
  try {
    await sdk.activity.log(entry);
  } catch {
    // See docblock — never let an activity-log failure surface to the user.
  }
}
