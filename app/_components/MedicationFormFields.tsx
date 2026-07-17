'use client';

import { FormField, Input, Select, Textarea } from '@sovereignfs/ui';
import type { MedicationEntry } from '../_lib/actions';
import { MEDICATION_KINDS, MEDICATION_KIND_LABELS } from '../_lib/medications';
import styles from './MedicationFormFields.module.css';

export function MedicationFormFields({ entry }: { entry?: MedicationEntry }) {
  return (
    <>
      <div className={styles.row}>
        <FormField label="Name">
          {(field) => <Input {...field} name="name" defaultValue={entry?.name ?? ''} required />}
        </FormField>
        <FormField label="Kind">
          {(field) => (
            <Select {...field} name="kind" defaultValue={entry?.kind ?? 'medication'}>
              {MEDICATION_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {MEDICATION_KIND_LABELS[kind]}
                </option>
              ))}
            </Select>
          )}
        </FormField>
      </div>

      <div className={styles.row}>
        <FormField label="Dose" hint='Free text — e.g. "10".'>
          {(field) => <Input {...field} name="dose" defaultValue={entry?.dose ?? ''} />}
        </FormField>
        <FormField label="Dose unit" hint="e.g. mg, mcg, ml, tablet.">
          {(field) => <Input {...field} name="doseUnit" defaultValue={entry?.doseUnit ?? ''} />}
        </FormField>
      </div>

      <FormField label="Route" hint="Optional — e.g. oral, topical, injection.">
        {(field) => <Input {...field} name="route" defaultValue={entry?.route ?? ''} />}
      </FormField>

      <FormField label="Frequency" hint='Free text — e.g. "once daily at night".'>
        {(field) => (
          <Input {...field} name="frequencyText" defaultValue={entry?.frequencyText ?? ''} />
        )}
      </FormField>

      <div className={styles.row}>
        <FormField label="Start date">
          {(field) => (
            <Input {...field} name="startDate" type="date" defaultValue={entry?.startDate ?? ''} />
          )}
        </FormField>
        <FormField label="End date" hint="Optional.">
          {(field) => (
            <Input {...field} name="endDate" type="date" defaultValue={entry?.endDate ?? ''} />
          )}
        </FormField>
      </div>

      <div className={styles.row}>
        <FormField label="Prescribing clinician">
          {(field) => (
            <Input
              {...field}
              name="prescribingClinician"
              defaultValue={entry?.prescribingClinician ?? ''}
            />
          )}
        </FormField>
        <FormField label="Pharmacy">
          {(field) => <Input {...field} name="pharmacy" defaultValue={entry?.pharmacy ?? ''} />}
        </FormField>
      </div>

      <FormField label="Notes">
        {(field) => <Textarea {...field} name="notes" rows={2} defaultValue={entry?.notes ?? ''} />}
      </FormField>

      {entry && (
        <FormField
          label="Note about this change"
          hint='Only saved if dose or frequency actually changed — e.g. "increased to 20mg".'
        >
          {(field) => <Input {...field} name="versionReason" />}
        </FormField>
      )}
    </>
  );
}
