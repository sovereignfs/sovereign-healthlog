'use server';

import { randomUUID } from 'node:crypto';
import { and, desc, eq } from 'drizzle-orm';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import { revalidatePath } from 'next/cache';
import { sdk } from '@sovereignfs/sdk';
import { healthlogMeasurements, healthlogProfiles } from '../_db/schema';
import { formOptionalString, formString, now, parseLocalDateOnly } from './formUtils';
import { FIXED_MEASUREMENT_TYPES } from './measurementTypes';
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
  const measuredAtDate = measuredAtRaw ? parseLocalDateOnly(measuredAtRaw) : new Date();
  if (!measuredAtDate) {
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

export interface MeasurementEntry {
  id: string;
  type: string;
  measuredAt: number;
  value: number;
  value2: number | null;
  unit: string;
  context: string | null;
  note: string | null;
}

/** Distinct types recorded that fall outside the fixed v0.1 set (HLG-10's "custom key"). */
export async function listCustomTypesInUse(): Promise<string[]> {
  const { db, userId, tenantId } = await getContext();
  const rows = await db
    .selectDistinct({ type: healthlogMeasurements.type })
    .from(healthlogMeasurements)
    .where(and(eq(healthlogMeasurements.tenantId, tenantId), eq(healthlogMeasurements.userId, userId)));
  const fixed = new Set<string>(FIXED_MEASUREMENT_TYPES);
  return rows
    .map((row) => row.type)
    .filter((type) => !fixed.has(type))
    .sort();
}

export async function listMeasurementsByType(type: string): Promise<MeasurementEntry[]> {
  const { db, userId, tenantId } = await getContext();
  return db
    .select({
      id: healthlogMeasurements.id,
      type: healthlogMeasurements.type,
      measuredAt: healthlogMeasurements.measuredAt,
      value: healthlogMeasurements.value,
      value2: healthlogMeasurements.value2,
      unit: healthlogMeasurements.unit,
      context: healthlogMeasurements.context,
      note: healthlogMeasurements.note,
    })
    .from(healthlogMeasurements)
    .where(
      and(
        eq(healthlogMeasurements.tenantId, tenantId),
        eq(healthlogMeasurements.userId, userId),
        eq(healthlogMeasurements.type, type),
      ),
    )
    .orderBy(desc(healthlogMeasurements.measuredAt));
}

interface ParsedMeasurementInput {
  type: string;
  measuredAt: number;
  value: number;
  value2: number | null;
  unit: string;
  context: string | null;
  note: string | null;
}

/**
 * Shared by add/update. `type === 'custom'` means "the type picker's own
 * 'Custom…' option was chosen" — the real stored type comes from the
 * `customType` free-text field (SPEC's "or custom key"), not the literal
 * string 'custom'.
 */
function parseMeasurementInput(formData: FormData): ParsedMeasurementInput | { error: string } {
  const typeChoice = formString(formData, 'type');
  const type = typeChoice === 'custom' ? formString(formData, 'customType') : typeChoice;
  if (!type) {
    return {
      error:
        typeChoice === 'custom'
          ? 'Enter a name for this custom measurement type.'
          : 'Choose a measurement type.',
    };
  }

  const valueRaw = formString(formData, 'value');
  const value = Number(valueRaw);
  if (!valueRaw || Number.isNaN(value)) {
    return { error: 'Enter a value.' };
  }

  let value2: number | null = null;
  if (type === 'blood_pressure') {
    const value2Raw = formString(formData, 'value2');
    const parsedValue2 = Number(value2Raw);
    if (!value2Raw || Number.isNaN(parsedValue2)) {
      return { error: 'Enter both systolic and diastolic values for blood pressure.' };
    }
    value2 = parsedValue2;
  }

  const unit = formString(formData, 'unit');
  if (!unit) {
    return { error: 'Enter a unit.' };
  }

  const measuredAtRaw = formString(formData, 'measuredAt');
  const measuredAtDate = measuredAtRaw ? new Date(measuredAtRaw) : new Date();
  if (Number.isNaN(measuredAtDate.getTime())) {
    return { error: 'Enter a valid date and time.' };
  }

  return {
    type,
    measuredAt: Math.floor(measuredAtDate.getTime() / 1000),
    value,
    value2,
    unit,
    context: formOptionalString(formData, 'context'),
    note: formOptionalString(formData, 'note'),
  };
}

export async function addMeasurement(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { db, userId, tenantId } = await getContext();
  const parsed = parseMeasurementInput(formData);
  if ('error' in parsed) return { ok: false, error: parsed.error };

  const ts = now();
  try {
    await db.insert(healthlogMeasurements).values({
      id: randomUUID(),
      tenantId,
      userId,
      ...parsed,
      source: 'manual',
      createdAt: ts,
      updatedAt: ts,
    });
  } catch {
    return { ok: false, error: 'Could not save this measurement. Please try again.' };
  }

  revalidatePath('/measurements');
  revalidatePath('/profile');
  return { ok: true, message: 'Measurement added.' };
}

export async function updateMeasurement(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { db, userId, tenantId } = await getContext();
  const id = formString(formData, 'id');
  if (!id) return { ok: false, error: 'Missing measurement id.' };

  const parsed = parseMeasurementInput(formData);
  if ('error' in parsed) return { ok: false, error: parsed.error };

  try {
    await db
      .update(healthlogMeasurements)
      .set({ ...parsed, updatedAt: now() })
      .where(
        and(
          eq(healthlogMeasurements.id, id),
          eq(healthlogMeasurements.tenantId, tenantId),
          eq(healthlogMeasurements.userId, userId),
        ),
      );
  } catch {
    return { ok: false, error: 'Could not save this measurement. Please try again.' };
  }

  revalidatePath('/measurements');
  revalidatePath('/profile');
  return { ok: true, message: 'Measurement updated.' };
}

export async function deleteMeasurement(id: string): Promise<void> {
  const { db, userId, tenantId } = await getContext();
  await db
    .delete(healthlogMeasurements)
    .where(
      and(
        eq(healthlogMeasurements.id, id),
        eq(healthlogMeasurements.tenantId, tenantId),
        eq(healthlogMeasurements.userId, userId),
      ),
    );
  revalidatePath('/measurements');
  revalidatePath('/profile');
}
