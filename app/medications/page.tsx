import { PageHeader } from '@sovereignfs/ui';
import { HealthLogNav } from '../_components/HealthLogNav';
import { MedicationsView } from '../_components/MedicationsView';
import { listMedications } from '../_lib/actions';
import styles from './page.module.css';

export default async function MedicationsPage() {
  const medications = await listMedications();

  return (
    <div className={styles.page}>
      <HealthLogNav active="/healthlog/medications" />

      <PageHeader
        title="Medications"
        description="Medications and supplements, active, ended, and archived."
      />

      <MedicationsView medications={medications} />
    </div>
  );
}
