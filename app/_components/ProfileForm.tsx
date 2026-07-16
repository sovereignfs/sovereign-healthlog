'use client';

import { useActionState } from 'react';
import { Button, FormField, Input, Select, Textarea } from '@sovereignfs/ui';
import type { ActionResult, ProfileData } from '../_lib/actions';
import { updateProfile } from '../_lib/actions';
import styles from './ProfileForm.module.css';

export function ProfileForm({ profile }: { profile: ProfileData }) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    updateProfile,
    null,
  );

  return (
    <form action={formAction} className={styles.form}>
      {state && !state.ok && (
        <p className={styles.feedbackError} role="status" aria-live="polite">
          {state.error}
        </p>
      )}
      {state && state.ok && state.message && (
        <p className={styles.feedbackSuccess} role="status" aria-live="polite">
          {state.message}
        </p>
      )}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>About you</h2>
        <div className={styles.grid}>
          <FormField label="Display name" hint="How you'd like to see your name in HealthLog.">
            {(field) => <Input {...field} name="displayName" defaultValue={profile.displayName} />}
          </FormField>
          <FormField label="Date of birth">
            {(field) => (
              <Input {...field} name="dateOfBirth" type="date" defaultValue={profile.dateOfBirth} />
            )}
          </FormField>
          <FormField label="Sex at birth" hint="Used for lab reference ranges where relevant.">
            {(field) => (
              <Select {...field} name="sexAtBirth" defaultValue={profile.sexAtBirth}>
                <option value="">Not set</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="intersex">Intersex</option>
                <option value="unspecified">Prefer not to say</option>
              </Select>
            )}
          </FormField>
          <FormField label="Gender identity">
            {(field) => <Input {...field} name="genderIdentity" defaultValue={profile.genderIdentity} />}
          </FormField>
          <FormField label="Blood type">
            {(field) => (
              <Select {...field} name="bloodType" defaultValue={profile.bloodType}>
                <option value="">Unknown</option>
                {['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'].map((bloodType) => (
                  <option key={bloodType} value={bloodType}>
                    {bloodType}
                  </option>
                ))}
              </Select>
            )}
          </FormField>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Preferred units</h2>
        <p className={styles.sectionHint}>
          The default unit offered on a new entry. Existing entries keep the unit they were
          recorded in.
        </p>
        <div className={styles.grid}>
          <FormField label="Height">
            {(field) => (
              <Select {...field} name="heightUnit" defaultValue={profile.preferredUnits.height}>
                <option value="cm">Centimeters (cm)</option>
                <option value="in">Inches (in)</option>
              </Select>
            )}
          </FormField>
          <FormField label="Weight">
            {(field) => (
              <Select {...field} name="weightUnit" defaultValue={profile.preferredUnits.weight}>
                <option value="kg">Kilograms (kg)</option>
                <option value="lb">Pounds (lb)</option>
              </Select>
            )}
          </FormField>
          <FormField label="Temperature">
            {(field) => (
              <Select
                {...field}
                name="temperatureUnit"
                defaultValue={profile.preferredUnits.temperature}
              >
                <option value="c">Celsius (°C)</option>
                <option value="f">Fahrenheit (°F)</option>
              </Select>
            )}
          </FormField>
          <FormField label="Blood glucose">
            {(field) => (
              <Select {...field} name="glucoseUnit" defaultValue={profile.preferredUnits.glucose}>
                <option value="mgdl">mg/dL</option>
                <option value="mmoll">mmol/L</option>
              </Select>
            )}
          </FormField>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Emergency context</h2>
        <p className={styles.sectionHint}>
          All optional — included on a visit summary export if you fill them in.
        </p>
        <div className={styles.grid}>
          <FormField label="Allergies" className={styles.spanTwo}>
            {(field) => (
              <Textarea {...field} name="allergies" rows={2} defaultValue={profile.allergies} />
            )}
          </FormField>
          <FormField label="Important conditions" className={styles.spanTwo}>
            {(field) => (
              <Textarea {...field} name="conditions" rows={2} defaultValue={profile.conditions} />
            )}
          </FormField>
          <FormField label="Emergency contact name">
            {(field) => (
              <Input
                {...field}
                name="emergencyContactName"
                defaultValue={profile.emergencyContactName}
              />
            )}
          </FormField>
          <FormField label="Emergency contact phone">
            {(field) => (
              <Input
                {...field}
                name="emergencyContactPhone"
                type="tel"
                defaultValue={profile.emergencyContactPhone}
              />
            )}
          </FormField>
          <FormField label="Primary clinician">
            {(field) => (
              <Input {...field} name="primaryClinician" defaultValue={profile.primaryClinician} />
            )}
          </FormField>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Notes</h2>
        <FormField label="Notes">
          {(field) => <Textarea {...field} name="notes" rows={3} defaultValue={profile.notes} />}
        </FormField>
      </section>

      <div className={styles.actions}>
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Save profile'}
        </Button>
      </div>
    </form>
  );
}
