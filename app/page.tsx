import { PageHeader } from '@sovereignfs/ui';
import { Dashboard } from './_components/Dashboard';
import { HealthLogNav } from './_components/HealthLogNav';
import { getDashboardSummary, getProfile } from './_lib/actions';
import styles from './healthlog.module.css';

export default async function HealthLogPage() {
  const [summary, profile] = await Promise.all([getDashboardSummary(), getProfile()]);

  return (
    <div className={styles.page}>
      <HealthLogNav active="/healthlog" />

      <PageHeader title="Dashboard" description="Your health at a glance." />

      <Dashboard summary={summary} preferredUnits={profile.preferredUnits} />
    </div>
  );
}
