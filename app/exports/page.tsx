import Link from 'next/link';
import { Button, Card, PageHeader } from '@sovereignfs/ui';
import { HealthLogNav } from '../_components/HealthLogNav';
import { VisitSummarySelector } from '../_components/VisitSummarySelector';
import { getVisitSummaryOptions } from '../_lib/actions';
import styles from './page.module.css';

/**
 * HLG-51/52's "Exports" primary-nav item. Full JSON export/import lives at
 * the platform's Account → Data page (`sdk.portability`, wired up in HL-10)
 * — nothing plugin-specific to build there, just a pointer. The visit
 * summary builder is the plugin-owned piece: pick which lab groups/notes to
 * include, then submit a plain GET form to `/healthlog/exports/summary` (no
 * client fetch — the result page reads the same selection back out of the
 * query string).
 */
export default async function ExportsPage() {
  const { labGroups, notes } = await getVisitSummaryOptions();

  return (
    <div className={styles.page}>
      <HealthLogNav active="/healthlog/exports" />

      <PageHeader title="Exports" description="Full data export and visit summary packets." />

      <Card>
        <h2 className={styles.cardTitle}>Full data export</h2>
        <p className={styles.cardBody}>
          Download a complete copy of your HealthLog data (profile, measurements, lab results,
          medications, and notes) from your account&apos;s Data page.
        </p>
        <Link href="/account/data" className={styles.cardLink}>
          <Button type="button">Go to Account → Data</Button>
        </Link>
      </Card>

      <Card>
        <h2 className={styles.cardTitle}>Visit summary</h2>
        <p className={styles.cardBody}>
          Builds a packet for a doctor visit: allergies, conditions, active medications, and
          recent measurements are always included. Choose which labs and notes to add below.
        </p>

        <form action="/healthlog/exports/summary" method="GET" className={styles.form}>
          <VisitSummarySelector labGroups={labGroups} notes={notes} />
          <Button type="submit">Build visit summary</Button>
        </form>
      </Card>
    </div>
  );
}
