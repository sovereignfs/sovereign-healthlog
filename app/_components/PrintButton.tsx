'use client';

import { Button } from '@sovereignfs/ui';

/** HLG-52's "PDF via browser print in v0.1" — no PDF library, the user's
 * own browser print dialog (which offers "Save as PDF" on every major OS)
 * is the export mechanism. Hidden at print time via the page's own
 * `@media print` rule, same as the nav and this button's containing toolbar. */
export function PrintButton() {
  return <Button onClick={() => window.print()}>Print / save as PDF</Button>;
}
