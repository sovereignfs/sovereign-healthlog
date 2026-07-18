import { PageHeader } from '@sovereignfs/ui';
import { HealthLogNav } from '../_components/HealthLogNav';
import { MeasurementsView } from '../_components/MeasurementsView';
import type { MeasurementEntry } from '../_lib/actions';
import { getProfile, listCustomTypesInUse, listMeasurementsByType } from '../_lib/actions';
import { FIXED_MEASUREMENT_TYPES } from '../_lib/measurementTypes';
import styles from './page.module.css';

export default async function MeasurementsPage() {
  const [profile, customTypes] = await Promise.all([getProfile(), listCustomTypesInUse()]);
  const allTypes: string[] = [...FIXED_MEASUREMENT_TYPES, ...customTypes];

  const entriesByType: Record<string, MeasurementEntry[]> = {};
  await Promise.all(
    allTypes.map(async (type) => {
      entriesByType[type] = await listMeasurementsByType(type);
    }),
  );

  return (
    <div className={styles.page}>
      <HealthLogNav active="/healthlog/measurements" />

      <PageHeader
        title="Measurements"
        description="Weight, blood pressure, heart rate, temperature, glucose, and custom readings."
      />

      <MeasurementsView
        entriesByType={entriesByType}
        customTypes={customTypes}
        preferredUnits={profile.preferredUnits}
      />
    </div>
  );
}
