'use server';

import { randomUUID } from 'node:crypto';
import { and, desc, eq } from 'drizzle-orm';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import { revalidatePath } from 'next/cache';
import { sdk } from '@sovereignfs/sdk';
import { healthlogMeasurements, healthlogProfiles } from '../_db/schema';
import { formOptionalString, formString, now } from './formUtils';
import type { PreferredUnits } from './units';
import { DEFAULT_PREFERRED_UNITS, parsePreferredUnits, serializePreferredUnits } from './units';

// DrizzleClient is typed as `unknown` in the SDK (dialect-agnostic contract).
// We cast to the SQLite type here since this plugin's manifest resolves to SQLite only.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = BaseSQLiteDatabase<'async', any, any>;

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

async function getContext() {
  const session = await sdk.auth.requireSession();
  const db = (await sdk.db.getClient()) as Db;
  return { db, userId: session.user.id, tenantId: session.user.tenantId };
}

const SEX_AT_BIRTH_OPTIONS = ['female', 'male', 'intersex', 'unspecified'] as const;
export type SexAtBirth = (typeof SEX_AT_BIRTH_OPTIONS)[number];

export interface ProfileData {
  displayName: string;
  dateOfBirth: string;
  sexAtBirth: SexAtBirth | '';
  genderIdentity: string;
  bloodType: string;
  preferredUnits: PreferredUnits;
  allergies: string;
  conditions: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  primaryClinician: string;
  notes: string;
}

const EMPTY_PROFILE: ProfileData = {
  displayName: '',
  dateOfBirth: '',
  sexAtBirth: '',
  genderIdentity: '',
  bloodType: '',
  preferredUnits: DEFAULT_PREFERRED_UNITS,
  allergies: '',
  conditions: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  primaryClinician: '',
  notes: '',
};

export async function getProfile(): Promise<ProfileData> {
  const { db, userId, tenantId } = await getContext();
  const [row] = await db
    .select()
    .from(healthlogProfiles)
    .where(and(eq(healthlogProfiles.tenantId, tenantId), eq(healthlogProfiles.userId, userId)));

  if (!row) return EMPTY_PROFILE;

  return {
    displayName: row.displayName ?? '',
    dateOfBirth: row.dateOfBirth ?? '',
    sexAtBirth: (row.sexAtBirth as SexAtBirth | null) ?? '',
    genderIdentity: row.genderIdentity ?? '',
    bloodType: row.bloodType ?? '',
    preferredUnits: parsePreferredUnits(row.preferredUnits),
    allergies: row.allergies ?? '',
    conditions: row.conditions ?? '',
    emergencyContactName: row.emergencyContactName ?? '',
    emergencyContactPhone: row.emergencyContactPhone ?? '',
    primaryClinician: row.primaryClinician ?? '',
    notes: row.notes ?? '',
  };
}

export async function updateProfile(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { db, userId, tenantId } = await getContext();

  const sexAtBirthRaw = formString(formData, 'sexAtBirth');
  const sexAtBirth = (
    SEX_AT_BIRTH_OPTIONS as readonly string[]
  ).includes(sexAtBirthRaw)
    ? (sexAtBirthRaw as SexAtBirth)
    : null;

  const preferredUnits: PreferredUnits = {
    height: formString(
      formData,
      'heightUnit',
      DEFAULT_PREFERRED_UNITS.height,
    ) as PreferredUnits['height'],
    weight: formString(
      formData,
      'weightUnit',
      DEFAULT_PREFERRED_UNITS.weight,
    ) as PreferredUnits['weight'],
    temperature: formString(
      formData,
      'temperatureUnit',
      DEFAULT_PREFERRED_UNITS.temperature,
    ) as PreferredUnits['temperature'],
    glucose: formString(
      formData,
      'glucoseUnit',
      DEFAULT_PREFERRED_UNITS.glucose,
    ) as PreferredUnits['glucose'],
  };

  const ts = now();
  const values = {
    tenantId,
    userId,
    displayName: formOptionalString(formData, 'displayName'),
    dateOfBirth: formOptionalString(formData, 'dateOfBirth'),
    sexAtBirth,
    genderIdentity: formOptionalString(formData, 'genderIdentity'),
    bloodType: formOptionalString(formData, 'bloodType'),
    preferredUnits: serializePreferredUnits(preferredUnits),
    allergies: formOptionalString(formData, 'allergies'),
    conditions: formOptionalString(formData, 'conditions'),
    emergencyContactName: formOptionalString(formData, 'emergencyContactName'),
    emergencyContactPhone: formOptionalString(formData, 'emergencyContactPhone'),
    primaryClinician: formOptionalString(formData, 'primaryClinician'),
    notes: formOptionalString(formData, 'notes'),
    updatedAt: ts,
  };

  try {
    await db
      .insert(healthlogProfiles)
      .values({ ...values, createdAt: ts })
      .onConflictDoUpdate({
        target: [healthlogProfiles.tenantId, healthlogProfiles.userId],
        set: values,
      });
  } catch {
    return { ok: false, error: 'Could not save your profile. Please try again.' };
  }

  revalidatePath('/profile');
  return { ok: true, message: 'Profile saved.' };
}

export interface HeightEntry {
  id: string;
  measuredAt: number;
  value: number;
  unit: string;
}

export async function listHeightEntries(limit = 5): Promise<HeightEntry[]> {
  const { db, userId, tenantId } = await getContext();
  return db
    .select({
      id: healthlogMeasurements.id,
      measuredAt: healthlogMeasurements.measuredAt,
      value: healthlogMeasurements.value,
      unit: healthlogMeasurements.unit,
    })
    .from(healthlogMeasurements)
    .where(
      and(
        eq(healthlogMeasurements.tenantId, tenantId),
        eq(healthlogMeasurements.userId, userId),
        eq(healthlogMeasurements.type, 'height'),
      ),
    )
    .orderBy(desc(healthlogMeasurements.measuredAt))
    .limit(limit);
}

export async function addHeightEntry(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { db, userId, tenantId } = await getContext();

  const valueRaw = formString(formData, 'value');
  const value = Number(valueRaw);
  if (!valueRaw || Number.isNaN(value) || value <= 0) {
    return { ok: false, error: 'Enter a height greater than zero.' };
  }

  const measuredAtRaw = formString(formData, 'measuredAt');
  const measuredAtDate = measuredAtRaw ? new Date(measuredAtRaw) : new Date();
  if (Number.isNaN(measuredAtDate.getTime())) {
    return { ok: false, error: 'Enter a valid date.' };
  }

  const unit = formString(formData, 'unit', DEFAULT_PREFERRED_UNITS.height);
  const ts = now();

  try {
    await db.insert(healthlogMeasurements).values({
      id: randomUUID(),
      tenantId,
      userId,
      type: 'height',
      measuredAt: Math.floor(measuredAtDate.getTime() / 1000),
      value,
      unit,
      source: 'manual',
      createdAt: ts,
      updatedAt: ts,
    });
  } catch {
    return { ok: false, error: 'Could not save this height entry. Please try again.' };
  }

  revalidatePath('/profile');
  return { ok: true, message: 'Height entry added.' };
}
