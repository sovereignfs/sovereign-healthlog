'use client';

import { useState } from 'react';
import { FormField, Input, Select, Textarea } from '@sovereignfs/ui';
import type { MeasurementEntry } from '../_lib/actions';
import { FIXED_MEASUREMENT_TYPES, MEASUREMENT_TYPE_LABELS } from '../_lib/measurementTypes';
import type { PreferredUnits } from '../_lib/units';
import { defaultUnitForType } from '../_lib/units';
import styles from './MeasurementFormFields.module.css';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function toLocalDateTimeInputValue(epochSeconds: number): string {
  const d = new Date(epochSeconds * 1000);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Shared field set for both the add and edit dialogs. `entry` (edit mode)
 * takes precedence for defaults; `initialType` (add mode) seeds the type
 * picker from whichever tab was active when "Add measurement" was clicked.
 */
export function MeasurementFormFields({
  entry,
  preferredUnits,
  initialType,
}: {
  entry?: MeasurementEntry;
  preferredUnits: PreferredUnits;
  initialType?: string;
}) {
  const startingType = entry?.type ?? initialType ?? 'weight';
  const isFixedStart = (FIXED_MEASUREMENT_TYPES as readonly string[]).includes(startingType);
  const [typeChoice, setTypeChoice] = useState(isFixedStart ? startingType : 'custom');

  return (
    <>
      <FormField label="Type">
        {(field) => (
          <Select
            {...field}
            name="type"
            value={typeChoice}
            onChange={(e) => setTypeChoice(e.target.value)}
          >
            {FIXED_MEASUREMENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {MEASUREMENT_TYPE_LABELS[type]}
              </option>
            ))}
            <option value="custom">Custom…</option>
          </Select>
        )}
      </FormField>

      {typeChoice === 'custom' && (
        <FormField label="Type name" hint="e.g. VO2 max, sleep hours.">
          {(field) => (
            <Input
              {...field}
              name="customType"
              defaultValue={isFixedStart ? '' : startingType}
              required
            />
          )}
        </FormField>
      )}

      <div className={styles.row}>
        <FormField
          label={typeChoice === 'blood_pressure' ? 'Systolic' : 'Value'}
          className={styles.valueField}
        >
          {(field) => (
            <Input
              {...field}
              name="value"
              type="number"
              step="any"
              defaultValue={entry?.value ?? ''}
              required
            />
          )}
        </FormField>

        {typeChoice === 'blood_pressure' && (
          <FormField label="Diastolic" className={styles.valueField}>
            {(field) => (
              <Input
                {...field}
                name="value2"
                type="number"
                step="any"
                defaultValue={entry?.value2 ?? ''}
                required
              />
            )}
          </FormField>
        )}

        <FormField label="Unit" className={styles.unitField} key={typeChoice}>
          {(field) => (
            <Input
              {...field}
              name="unit"
              defaultValue={entry?.unit ?? defaultUnitForType(typeChoice, preferredUnits)}
              required
            />
          )}
        </FormField>
      </div>

      <FormField label="Date and time">
        {(field) => (
          <Input
            {...field}
            name="measuredAt"
            type="datetime-local"
            defaultValue={
              entry
                ? toLocalDateTimeInputValue(entry.measuredAt)
                : toLocalDateTimeInputValue(Math.floor(Date.now() / 1000))
            }
          />
        )}
      </FormField>

      <FormField label="Context" hint="Optional — fasting, seated, morning, after exercise, etc.">
        {(field) => <Input {...field} name="context" defaultValue={entry?.context ?? ''} />}
      </FormField>

      <FormField label="Note">
        {(field) => <Textarea {...field} name="note" rows={2} defaultValue={entry?.note ?? ''} />}
      </FormField>
    </>
  );
}
