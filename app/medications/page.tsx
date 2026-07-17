import { PageHeader } from '@sovereignfs/ui';
import { BackLink } from '../_components/BackLink';
import { MedicationsView } from '../_components/MedicationsView';
import { listMedications } from '../_lib/actions';
import styles from './page.module.css';

export default async function MedicationsPage() {
  const medications = await listMedications();

  return (
    <div className={styles.page}>
      <BackLink href="/healthlog">Back</BackLink>

      <PageHeader
        title="Medications"
        description="Medications and supplements, active, ended, and archived."
      />

      <MedicationsView medications={medications} />
    </div>
  );
}
