'use client';

import { FormField, Input, Textarea } from '@sovereignfs/ui';
import type { LabGroupDetail } from '../_lib/actions';
import styles from './LabGroupFormFields.module.css';

export function LabGroupFormFields({ group }: { group?: LabGroupDetail }) {
  return (
    <>
      <FormField label="Title" hint='e.g. "Annual bloodwork".'>
        {(field) => <Input {...field} name="title" defaultValue={group?.title ?? ''} required />}
      </FormField>

      <div className={styles.row}>
        <FormField label="Collection date">
          {(field) => (
            <Input {...field} name="collectedAt" type="date" defaultValue={group?.collectedAt ?? ''} required />
          )}
        </FormField>
        <FormField label="Report date" hint="Optional.">
          {(field) => (
            <Input {...field} name="reportedAt" type="date" defaultValue={group?.reportedAt ?? ''} />
          )}
        </FormField>
      </div>

      <FormField label="Lab / provider">
        {(field) => <Input {...field} name="provider" defaultValue={group?.provider ?? ''} />}
      </FormField>

      <FormField label="Notes">
        {(field) => <Textarea {...field} name="notes" rows={3} defaultValue={group?.notes ?? ''} />}
      </FormField>
    </>
  );
}
