'use server';

import { randomUUID } from 'node:crypto';
import { and, desc, eq, inArray } from 'drizzle-orm';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { sdk } from '@sovereignfs/sdk';
import {
  healthlogLabGroups,
  healthlogLabResults,
  healthlogMeasurements,
  healthlogMedications,
  healthlogNotes,
  healthlogProfiles,
} from '../_db/schema';
import {
  epochToLocalDateOnly,
  formOptionalString,
  formString,
  now,
  parseLocalDateOnly,
  todayLocalDateOnly,
} from './formUtils';
import type { LabFlag, LabValueKind } from './labFormat';
import { LAB_VALUE_KINDS, formatLabResultValue } from './labFormat';
import { normalizeTestName } from './labMatching';
import { FIXED_MEASUREMENT_TYPES, MEASUREMENT_TYPE_LABELS } from './measurementTypes';
import type { MedicationKind, MedicationStatus } from './medications';
import { MEDICATION_KINDS, computeEffectiveStatus } from './medications';
import type { NoteCategory, NoteLinkType } from './notes';
import { NOTE_CATEGORIES, NOTE_LINK_TYPES } from './notes';
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

  revalidatePath('/healthlog/profile');
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

  revalidatePath('/healthlog/profile');
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

  revalidatePath('/healthlog/measurements');
  revalidatePath('/healthlog/profile');
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

  revalidatePath('/healthlog/measurements');
  revalidatePath('/healthlog/profile');
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
  revalidatePath('/healthlog/measurements');
  revalidatePath('/healthlog/profile');
}

export interface LabGroupSummary {
  id: string;
  title: string;
  collectedAt: string;
  reportedAt: string | null;
  provider: string | null;
  resultCount: number;
}

export interface LabGroupDetail {
  id: string;
  title: string;
  collectedAt: string;
  reportedAt: string | null;
  provider: string | null;
  notes: string | null;
}

export async function listLabGroups(): Promise<LabGroupSummary[]> {
  const { db, userId, tenantId } = await getContext();
  const groups = await db
    .select({
      id: healthlogLabGroups.id,
      title: healthlogLabGroups.title,
      collectedAt: healthlogLabGroups.collectedAt,
      reportedAt: healthlogLabGroups.reportedAt,
      provider: healthlogLabGroups.provider,
    })
    .from(healthlogLabGroups)
    .where(and(eq(healthlogLabGroups.tenantId, tenantId), eq(healthlogLabGroups.userId, userId)))
    .orderBy(desc(healthlogLabGroups.collectedAt));

  // Counted in JS rather than a SQL GROUP BY — v0.1 personal-record data
  // volumes are small, and this avoids pulling in `sql` template literals
  // for a single query.
  const resultRows = await db
    .select({ groupId: healthlogLabResults.groupId })
    .from(healthlogLabResults)
    .where(and(eq(healthlogLabResults.tenantId, tenantId), eq(healthlogLabResults.userId, userId)));
  const counts = new Map<string, number>();
  for (const row of resultRows) counts.set(row.groupId, (counts.get(row.groupId) ?? 0) + 1);

  return groups.map((group) => ({ ...group, resultCount: counts.get(group.id) ?? 0 }));
}

export async function getLabGroup(id: string): Promise<LabGroupDetail | null> {
  const { db, userId, tenantId } = await getContext();
  const [row] = await db
    .select({
      id: healthlogLabGroups.id,
      title: healthlogLabGroups.title,
      collectedAt: healthlogLabGroups.collectedAt,
      reportedAt: healthlogLabGroups.reportedAt,
      provider: healthlogLabGroups.provider,
      notes: healthlogLabGroups.notes,
    })
    .from(healthlogLabGroups)
    .where(
      and(
        eq(healthlogLabGroups.id, id),
        eq(healthlogLabGroups.tenantId, tenantId),
        eq(healthlogLabGroups.userId, userId),
      ),
    );
  return row ?? null;
}

interface ParsedLabGroupInput {
  title: string;
  collectedAt: string;
  reportedAt: string | null;
  provider: string | null;
  notes: string | null;
}

function parseLabGroupInput(formData: FormData): ParsedLabGroupInput | { error: string } {
  const title = formString(formData, 'title');
  if (!title) return { error: 'Enter a title.' };

  const collectedAt = formString(formData, 'collectedAt');
  if (!collectedAt || !parseLocalDateOnly(collectedAt)) {
    return { error: 'Enter a valid collection date.' };
  }

  const reportedAt = formOptionalString(formData, 'reportedAt');
  if (reportedAt && !parseLocalDateOnly(reportedAt)) {
    return { error: 'Enter a valid report date.' };
  }

  return {
    title,
    collectedAt,
    reportedAt,
    provider: formOptionalString(formData, 'provider'),
    notes: formOptionalString(formData, 'notes'),
  };
}

export async function addLabGroup(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { db, userId, tenantId } = await getContext();
  const parsed = parseLabGroupInput(formData);
  if ('error' in parsed) return { ok: false, error: parsed.error };

  const id = randomUUID();
  const ts = now();
  try {
    await db.insert(healthlogLabGroups).values({
      id,
      tenantId,
      userId,
      ...parsed,
      createdAt: ts,
      updatedAt: ts,
    });
  } catch {
    return { ok: false, error: 'Could not save this lab group. Please try again.' };
  }

  // Redirect straight into the new group — the reason to create one is to
  // start adding results inside it. Outside the try/catch above: redirect()
  // throws internally to unwind the render, which a broad catch would
  // otherwise swallow as a save failure.
  revalidatePath('/healthlog/labs');
  redirect(`/healthlog/labs/${id}`);
}

export async function updateLabGroup(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { db, userId, tenantId } = await getContext();
  const id = formString(formData, 'id');
  if (!id) return { ok: false, error: 'Missing lab group id.' };

  const parsed = parseLabGroupInput(formData);
  if ('error' in parsed) return { ok: false, error: parsed.error };

  try {
    await db
      .update(healthlogLabGroups)
      .set({ ...parsed, updatedAt: now() })
      .where(
        and(
          eq(healthlogLabGroups.id, id),
          eq(healthlogLabGroups.tenantId, tenantId),
          eq(healthlogLabGroups.userId, userId),
        ),
      );
  } catch {
    return { ok: false, error: 'Could not save this lab group. Please try again.' };
  }

  revalidatePath('/healthlog/labs');
  revalidatePath(`/healthlog/labs/${id}`);
  return { ok: true, message: 'Lab group updated.' };
}

export async function deleteLabGroup(id: string): Promise<void> {
  const { db, userId, tenantId } = await getContext();
  // Sequential delete-then-delete, not db.transaction(): better-sqlite3's
  // transaction() rejects an async callback at runtime even though the SDK's
  // dialect-agnostic Db type lets `await db.transaction(async (tx) => ...)`
  // type-check fine — same pitfall documented in sovereign-plainwrite's
  // actions.ts. A crash between the two statements can leave orphaned result
  // rows; low impact and self-healing (invisible, scoped under a group_id
  // that no longer resolves to anything).
  await db
    .delete(healthlogLabResults)
    .where(
      and(
        eq(healthlogLabResults.groupId, id),
        eq(healthlogLabResults.tenantId, tenantId),
        eq(healthlogLabResults.userId, userId),
      ),
    );
  await db
    .delete(healthlogLabGroups)
    .where(
      and(
        eq(healthlogLabGroups.id, id),
        eq(healthlogLabGroups.tenantId, tenantId),
        eq(healthlogLabGroups.userId, userId),
      ),
    );
  revalidatePath('/healthlog/labs');
  redirect('/healthlog/labs');
}

export interface LabResultEntry {
  id: string;
  groupId: string;
  testName: string;
  normalizedTestName: string;
  valueKind: LabValueKind;
  numericValue: number | null;
  textValue: string | null;
  unit: string | null;
  referenceLow: number | null;
  referenceHigh: number | null;
  referenceText: string | null;
  flag: LabFlag | null;
  tracked: boolean;
  note: string | null;
}

export async function listLabResults(groupId: string): Promise<LabResultEntry[]> {
  const { db, userId, tenantId } = await getContext();
  const rows = await db
    .select({
      id: healthlogLabResults.id,
      groupId: healthlogLabResults.groupId,
      testName: healthlogLabResults.testName,
      normalizedTestName: healthlogLabResults.normalizedTestName,
      valueKind: healthlogLabResults.valueKind,
      numericValue: healthlogLabResults.numericValue,
      textValue: healthlogLabResults.textValue,
      unit: healthlogLabResults.unit,
      referenceLow: healthlogLabResults.referenceLow,
      referenceHigh: healthlogLabResults.referenceHigh,
      referenceText: healthlogLabResults.referenceText,
      flag: healthlogLabResults.flag,
      tracked: healthlogLabResults.tracked,
      note: healthlogLabResults.note,
    })
    .from(healthlogLabResults)
    .where(
      and(
        eq(healthlogLabResults.groupId, groupId),
        eq(healthlogLabResults.tenantId, tenantId),
        eq(healthlogLabResults.userId, userId),
      ),
    )
    .orderBy(healthlogLabResults.createdAt);
  return rows as LabResultEntry[];
}

interface ParsedLabResultInput {
  testName: string;
  normalizedTestName: string;
  valueKind: LabValueKind;
  numericValue: number | null;
  textValue: string | null;
  unit: string | null;
  referenceLow: number | null;
  referenceHigh: number | null;
  referenceText: string | null;
  flag: LabFlag | null;
  tracked: boolean;
  note: string | null;
}

const LAB_FLAGS = ['low', 'high', 'critical', 'abnormal'] as const;

function parseLabResultInput(formData: FormData): ParsedLabResultInput | { error: string } {
  const testName = formString(formData, 'testName');
  if (!testName) return { error: 'Enter a test name.' };

  const valueKindRaw = formString(formData, 'valueKind');
  if (!(LAB_VALUE_KINDS as readonly string[]).includes(valueKindRaw)) {
    return { error: 'Choose a value type.' };
  }
  const valueKind = valueKindRaw as LabValueKind;

  let numericValue: number | null = null;
  let textValue: string | null = null;

  if (valueKind === 'numeric') {
    const raw = formString(formData, 'numericValue');
    const parsed = Number(raw);
    if (!raw || Number.isNaN(parsed)) return { error: 'Enter a numeric value.' };
    numericValue = parsed;
  } else if (valueKind === 'text') {
    textValue = formOptionalString(formData, 'textValue');
    if (!textValue) return { error: 'Enter a value.' };
  } else if (valueKind === 'positive_negative') {
    const raw = formString(formData, 'positiveNegativeValue');
    if (raw !== 'positive' && raw !== 'negative') return { error: 'Choose positive or negative.' };
    textValue = raw;
  } else {
    const raw = formString(formData, 'detectedValue');
    if (raw !== 'detected' && raw !== 'not_detected') {
      return { error: 'Choose detected or not detected.' };
    }
    textValue = raw;
  }

  const unit = valueKind === 'numeric' ? formOptionalString(formData, 'unit') : null;

  const referenceLowRaw = formString(formData, 'referenceLow');
  const referenceLow = referenceLowRaw === '' ? null : Number(referenceLowRaw);
  if (referenceLow != null && Number.isNaN(referenceLow)) {
    return { error: 'Enter a valid reference range low.' };
  }

  const referenceHighRaw = formString(formData, 'referenceHigh');
  const referenceHigh = referenceHighRaw === '' ? null : Number(referenceHighRaw);
  if (referenceHigh != null && Number.isNaN(referenceHigh)) {
    return { error: 'Enter a valid reference range high.' };
  }

  const flagRaw = formString(formData, 'flag');
  const flag = (LAB_FLAGS as readonly string[]).includes(flagRaw) ? (flagRaw as LabFlag) : null;

  return {
    testName,
    normalizedTestName: normalizeTestName(testName),
    valueKind,
    numericValue,
    textValue,
    unit,
    referenceLow,
    referenceHigh,
    referenceText: formOptionalString(formData, 'referenceText'),
    flag,
    tracked: formString(formData, 'tracked') === 'true',
    note: formOptionalString(formData, 'note'),
  };
}

export async function addLabResult(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { db, userId, tenantId } = await getContext();
  const groupId = formString(formData, 'groupId');
  if (!groupId) return { ok: false, error: 'Missing lab group id.' };

  const parsed = parseLabResultInput(formData);
  if ('error' in parsed) return { ok: false, error: parsed.error };

  const ts = now();
  try {
    await db.insert(healthlogLabResults).values({
      id: randomUUID(),
      tenantId,
      userId,
      groupId,
      ...parsed,
      createdAt: ts,
      updatedAt: ts,
    });
  } catch {
    return { ok: false, error: 'Could not save this lab result. Please try again.' };
  }

  revalidatePath(`/healthlog/labs/${groupId}`);
  return { ok: true, message: 'Result added.' };
}

export async function updateLabResult(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { db, userId, tenantId } = await getContext();
  const id = formString(formData, 'id');
  const groupId = formString(formData, 'groupId');
  if (!id || !groupId) return { ok: false, error: 'Missing lab result id.' };

  const parsed = parseLabResultInput(formData);
  if ('error' in parsed) return { ok: false, error: parsed.error };

  try {
    await db
      .update(healthlogLabResults)
      .set({ ...parsed, updatedAt: now() })
      .where(
        and(
          eq(healthlogLabResults.id, id),
          eq(healthlogLabResults.tenantId, tenantId),
          eq(healthlogLabResults.userId, userId),
        ),
      );
  } catch {
    return { ok: false, error: 'Could not save this lab result. Please try again.' };
  }

  revalidatePath(`/healthlog/labs/${groupId}`);
  return { ok: true, message: 'Result updated.' };
}

export async function deleteLabResult(id: string, groupId: string): Promise<void> {
  const { db, userId, tenantId } = await getContext();
  await db
    .delete(healthlogLabResults)
    .where(
      and(
        eq(healthlogLabResults.id, id),
        eq(healthlogLabResults.tenantId, tenantId),
        eq(healthlogLabResults.userId, userId),
      ),
    );
  revalidatePath(`/healthlog/labs/${groupId}`);
}

export async function setLabResultTracked(
  id: string,
  groupId: string,
  tracked: boolean,
): Promise<void> {
  const { db, userId, tenantId } = await getContext();
  await db
    .update(healthlogLabResults)
    .set({ tracked, updatedAt: now() })
    .where(
      and(
        eq(healthlogLabResults.id, id),
        eq(healthlogLabResults.tenantId, tenantId),
        eq(healthlogLabResults.userId, userId),
      ),
    );
  revalidatePath(`/healthlog/labs/${groupId}`);
}

export interface PreviousLabResult {
  id: string;
  groupTitle: string;
  collectedAt: string;
  displayValue: string;
}

/** HLG-24: name-based previous-value lookup, shown when entering or editing a result. */
export async function getPreviousLabResults(
  normalizedTestNameValue: string,
  excludeResultId?: string,
  limit = 3,
): Promise<PreviousLabResult[]> {
  if (!normalizedTestNameValue) return [];
  const { db, userId, tenantId } = await getContext();
  const rows = await db
    .select({
      id: healthlogLabResults.id,
      valueKind: healthlogLabResults.valueKind,
      numericValue: healthlogLabResults.numericValue,
      textValue: healthlogLabResults.textValue,
      unit: healthlogLabResults.unit,
      groupTitle: healthlogLabGroups.title,
      collectedAt: healthlogLabGroups.collectedAt,
    })
    .from(healthlogLabResults)
    .innerJoin(healthlogLabGroups, eq(healthlogLabResults.groupId, healthlogLabGroups.id))
    .where(
      and(
        eq(healthlogLabResults.tenantId, tenantId),
        eq(healthlogLabResults.userId, userId),
        eq(healthlogLabResults.normalizedTestName, normalizedTestNameValue),
      ),
    )
    .orderBy(desc(healthlogLabGroups.collectedAt));

  return rows
    .filter((row) => row.id !== excludeResultId)
    .slice(0, limit)
    .map((row) => ({
      id: row.id,
      groupTitle: row.groupTitle,
      collectedAt: row.collectedAt,
      displayValue: formatLabResultValue(row),
    }));
}

export interface MedicationEntry {
  id: string;
  seriesId: string;
  name: string;
  kind: MedicationKind;
  dose: string | null;
  doseUnit: string | null;
  route: string | null;
  frequencyText: string | null;
  startDate: string | null;
  endDate: string | null;
  prescribingClinician: string | null;
  pharmacy: string | null;
  notes: string | null;
  effectiveStatus: MedicationStatus;
  versionCount: number;
}

/** Current (latest-per-series) medications, with HLG-32's status derived at
 * read time — see `computeEffectiveStatus`'s own comment for why. */
export async function listMedications(): Promise<MedicationEntry[]> {
  const { db, userId, tenantId } = await getContext();
  const rows = await db
    .select()
    .from(healthlogMedications)
    .where(and(eq(healthlogMedications.tenantId, tenantId), eq(healthlogMedications.userId, userId)))
    .orderBy(desc(healthlogMedications.createdAt));

  // Rows are already createdAt-desc, so the first row seen per seriesId is
  // that series' current version.
  const latestBySeries = new Map<string, (typeof rows)[number]>();
  const versionCounts = new Map<string, number>();
  for (const row of rows) {
    versionCounts.set(row.seriesId, (versionCounts.get(row.seriesId) ?? 0) + 1);
    if (!latestBySeries.has(row.seriesId)) latestBySeries.set(row.seriesId, row);
  }

  const todayIso = todayLocalDateOnly();
  return [...latestBySeries.values()].map((row) => ({
    id: row.id,
    seriesId: row.seriesId,
    name: row.name,
    kind: row.kind as MedicationKind,
    dose: row.dose,
    doseUnit: row.doseUnit,
    route: row.route,
    frequencyText: row.frequencyText,
    startDate: row.startDate,
    endDate: row.endDate,
    prescribingClinician: row.prescribingClinician,
    pharmacy: row.pharmacy,
    notes: row.notes,
    effectiveStatus: computeEffectiveStatus(row.status, row.endDate, todayIso),
    versionCount: versionCounts.get(row.seriesId) ?? 1,
  }));
}

export interface MedicationVersion {
  id: string;
  dose: string | null;
  doseUnit: string | null;
  frequencyText: string | null;
  startDate: string | null;
  endDate: string | null;
  versionReason: string | null;
  createdAt: number;
}

export async function listMedicationVersions(seriesId: string): Promise<MedicationVersion[]> {
  const { db, userId, tenantId } = await getContext();
  return db
    .select({
      id: healthlogMedications.id,
      dose: healthlogMedications.dose,
      doseUnit: healthlogMedications.doseUnit,
      frequencyText: healthlogMedications.frequencyText,
      startDate: healthlogMedications.startDate,
      endDate: healthlogMedications.endDate,
      versionReason: healthlogMedications.versionReason,
      createdAt: healthlogMedications.createdAt,
    })
    .from(healthlogMedications)
    .where(
      and(
        eq(healthlogMedications.seriesId, seriesId),
        eq(healthlogMedications.tenantId, tenantId),
        eq(healthlogMedications.userId, userId),
      ),
    )
    .orderBy(desc(healthlogMedications.createdAt));
}

interface ParsedMedicationInput {
  name: string;
  kind: MedicationKind;
  dose: string | null;
  doseUnit: string | null;
  route: string | null;
  frequencyText: string | null;
  startDate: string | null;
  endDate: string | null;
  prescribingClinician: string | null;
  pharmacy: string | null;
  notes: string | null;
  versionReason: string | null;
}

function parseMedicationInput(formData: FormData): ParsedMedicationInput | { error: string } {
  const name = formString(formData, 'name');
  if (!name) return { error: 'Enter a medication name.' };

  const kindRaw = formString(formData, 'kind');
  if (!(MEDICATION_KINDS as readonly string[]).includes(kindRaw)) {
    return { error: 'Choose a kind.' };
  }
  const kind = kindRaw as MedicationKind;

  const startDate = formOptionalString(formData, 'startDate');
  if (startDate && !parseLocalDateOnly(startDate)) {
    return { error: 'Enter a valid start date.' };
  }

  const endDate = formOptionalString(formData, 'endDate');
  if (endDate && !parseLocalDateOnly(endDate)) {
    return { error: 'Enter a valid end date.' };
  }

  return {
    name,
    kind,
    dose: formOptionalString(formData, 'dose'),
    doseUnit: formOptionalString(formData, 'doseUnit'),
    route: formOptionalString(formData, 'route'),
    frequencyText: formOptionalString(formData, 'frequencyText'),
    startDate,
    endDate,
    prescribingClinician: formOptionalString(formData, 'prescribingClinician'),
    pharmacy: formOptionalString(formData, 'pharmacy'),
    notes: formOptionalString(formData, 'notes'),
    versionReason: formOptionalString(formData, 'versionReason'),
  };
}

export async function addMedication(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { db, userId, tenantId } = await getContext();
  const parsed = parseMedicationInput(formData);
  if ('error' in parsed) return { ok: false, error: parsed.error };

  const ts = now();
  try {
    await db.insert(healthlogMedications).values({
      id: randomUUID(),
      tenantId,
      userId,
      seriesId: randomUUID(),
      name: parsed.name,
      kind: parsed.kind,
      dose: parsed.dose,
      doseUnit: parsed.doseUnit,
      route: parsed.route,
      frequencyText: parsed.frequencyText,
      startDate: parsed.startDate,
      endDate: parsed.endDate,
      prescribingClinician: parsed.prescribingClinician,
      pharmacy: parsed.pharmacy,
      status: 'active',
      notes: parsed.notes,
      versionReason: null,
      createdAt: ts,
      updatedAt: ts,
    });
  } catch {
    return { ok: false, error: 'Could not save this medication. Please try again.' };
  }

  revalidatePath('/healthlog/medications');
  return { ok: true, message: 'Medication added.' };
}

export async function updateMedication(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { db, userId, tenantId } = await getContext();
  const id = formString(formData, 'id');
  if (!id) return { ok: false, error: 'Missing medication id.' };

  const parsed = parseMedicationInput(formData);
  if ('error' in parsed) return { ok: false, error: parsed.error };

  const [current] = await db
    .select()
    .from(healthlogMedications)
    .where(
      and(
        eq(healthlogMedications.id, id),
        eq(healthlogMedications.tenantId, tenantId),
        eq(healthlogMedications.userId, userId),
      ),
    );
  if (!current) return { ok: false, error: 'Medication not found.' };

  // HLG-33: only dose/frequency changes are significant enough to version —
  // everything else (name typo fix, added pharmacy, etc.) updates in place.
  const versioned =
    (current.dose ?? '') !== (parsed.dose ?? '') ||
    (current.frequencyText ?? '') !== (parsed.frequencyText ?? '');

  const ts = now();
  try {
    if (versioned) {
      await db.insert(healthlogMedications).values({
        id: randomUUID(),
        tenantId,
        userId,
        seriesId: current.seriesId,
        name: parsed.name,
        kind: parsed.kind,
        dose: parsed.dose,
        doseUnit: parsed.doseUnit,
        route: parsed.route,
        frequencyText: parsed.frequencyText,
        startDate: parsed.startDate,
        endDate: parsed.endDate,
        prescribingClinician: parsed.prescribingClinician,
        pharmacy: parsed.pharmacy,
        // Carries the archived override forward across versions; `ended` is
        // never stored (see computeEffectiveStatus).
        status: current.status,
        notes: parsed.notes,
        versionReason: parsed.versionReason,
        createdAt: ts,
        updatedAt: ts,
      });
    } else {
      await db
        .update(healthlogMedications)
        .set({
          name: parsed.name,
          kind: parsed.kind,
          dose: parsed.dose,
          doseUnit: parsed.doseUnit,
          route: parsed.route,
          frequencyText: parsed.frequencyText,
          startDate: parsed.startDate,
          endDate: parsed.endDate,
          prescribingClinician: parsed.prescribingClinician,
          pharmacy: parsed.pharmacy,
          notes: parsed.notes,
          updatedAt: ts,
        })
        .where(
          and(
            eq(healthlogMedications.id, id),
            eq(healthlogMedications.tenantId, tenantId),
            eq(healthlogMedications.userId, userId),
          ),
        );
    }
  } catch {
    return { ok: false, error: 'Could not save this medication. Please try again.' };
  }

  revalidatePath('/healthlog/medications');
  return { ok: true, message: versioned ? 'New version saved.' : 'Medication updated.' };
}

export async function setMedicationArchived(id: string, archived: boolean): Promise<void> {
  const { db, userId, tenantId } = await getContext();
  await db
    .update(healthlogMedications)
    .set({ status: archived ? 'archived' : 'active', updatedAt: now() })
    .where(
      and(
        eq(healthlogMedications.id, id),
        eq(healthlogMedications.tenantId, tenantId),
        eq(healthlogMedications.userId, userId),
      ),
    );
  revalidatePath('/healthlog/medications');
}

/** Deletes every version in the series — "delete this medication" reads as
 * removing the whole thing, not surgically dropping just its latest row and
 * leaving stale history behind. */
export async function deleteMedicationSeries(seriesId: string): Promise<void> {
  const { db, userId, tenantId } = await getContext();
  await db
    .delete(healthlogMedications)
    .where(
      and(
        eq(healthlogMedications.seriesId, seriesId),
        eq(healthlogMedications.tenantId, tenantId),
        eq(healthlogMedications.userId, userId),
      ),
    );
  revalidatePath('/healthlog/medications');
}

export interface LinkableRecord {
  id: string;
  label: string;
}

interface MeasurementLinkRow {
  type: string;
  value: number;
  value2: number | null;
  unit: string;
  measuredAt: number;
}

function formatMeasurementLinkLabel(row: MeasurementLinkRow): string {
  const typeLabel = (MEASUREMENT_TYPE_LABELS as Record<string, string>)[row.type] ?? row.type;
  const valuePart =
    row.type === 'blood_pressure' && row.value2 != null
      ? `${row.value}/${row.value2} ${row.unit}`
      : `${row.value} ${row.unit}`;
  return `${typeLabel} · ${valuePart} · ${epochToLocalDateOnly(row.measuredAt)}`;
}

/** HLG-41's record pickers — capped to the 25 most recent per type, which is
 * enough to find a just-added record without listing a user's entire
 * history in one dropdown. */
export async function listLinkableRecords(type: string): Promise<LinkableRecord[]> {
  const { db, userId, tenantId } = await getContext();

  if (type === 'measurement') {
    const rows = await db
      .select({
        id: healthlogMeasurements.id,
        type: healthlogMeasurements.type,
        value: healthlogMeasurements.value,
        value2: healthlogMeasurements.value2,
        unit: healthlogMeasurements.unit,
        measuredAt: healthlogMeasurements.measuredAt,
      })
      .from(healthlogMeasurements)
      .where(and(eq(healthlogMeasurements.tenantId, tenantId), eq(healthlogMeasurements.userId, userId)))
      .orderBy(desc(healthlogMeasurements.measuredAt))
      .limit(25);
    return rows.map((row) => ({ id: row.id, label: formatMeasurementLinkLabel(row) }));
  }

  if (type === 'lab_group') {
    const rows = await db
      .select({
        id: healthlogLabGroups.id,
        title: healthlogLabGroups.title,
        collectedAt: healthlogLabGroups.collectedAt,
      })
      .from(healthlogLabGroups)
      .where(and(eq(healthlogLabGroups.tenantId, tenantId), eq(healthlogLabGroups.userId, userId)))
      .orderBy(desc(healthlogLabGroups.collectedAt))
      .limit(25);
    return rows.map((row) => ({ id: row.id, label: `${row.title} · ${row.collectedAt}` }));
  }

  if (type === 'medication') {
    // Latest-per-series, same grouping as listMedications() — linking to an
    // old dose version of a medication wouldn't mean anything a user
    // expects; the current version is what "this medication" refers to.
    const rows = await db
      .select()
      .from(healthlogMedications)
      .where(and(eq(healthlogMedications.tenantId, tenantId), eq(healthlogMedications.userId, userId)))
      .orderBy(desc(healthlogMedications.createdAt));
    const seenSeries = new Set<string>();
    const latest: LinkableRecord[] = [];
    for (const row of rows) {
      if (seenSeries.has(row.seriesId)) continue;
      seenSeries.add(row.seriesId);
      latest.push({ id: row.id, label: [row.name, row.dose, row.doseUnit].filter(Boolean).join(' · ') });
      if (latest.length >= 25) break;
    }
    return latest;
  }

  return [];
}

export interface NoteEntry {
  id: string;
  notedAt: number;
  category: NoteCategory;
  title: string;
  body: string;
  linkedType: NoteLinkType | null;
  linkedId: string | null;
  /** Resolved for display; `null` if unlinked or the linked record no
   * longer exists (deleted since the note was linked — shown as unlinked
   * rather than a broken reference). */
  linkedLabel: string | null;
}

export async function listNotes(): Promise<NoteEntry[]> {
  const { db, userId, tenantId } = await getContext();
  const rows = await db
    .select()
    .from(healthlogNotes)
    .where(and(eq(healthlogNotes.tenantId, tenantId), eq(healthlogNotes.userId, userId)))
    .orderBy(desc(healthlogNotes.notedAt));

  const idsByType = (type: NoteLinkType) =>
    rows.filter((row) => row.linkedType === type && row.linkedId).map((row) => row.linkedId as string);
  const measurementIds = idsByType('measurement');
  const labGroupIds = idsByType('lab_group');
  const medicationIds = idsByType('medication');

  const labelMap = new Map<string, string>();

  if (measurementIds.length > 0) {
    const measurementRows = await db
      .select({
        id: healthlogMeasurements.id,
        type: healthlogMeasurements.type,
        value: healthlogMeasurements.value,
        value2: healthlogMeasurements.value2,
        unit: healthlogMeasurements.unit,
        measuredAt: healthlogMeasurements.measuredAt,
      })
      .from(healthlogMeasurements)
      .where(
        and(
          eq(healthlogMeasurements.tenantId, tenantId),
          eq(healthlogMeasurements.userId, userId),
          inArray(healthlogMeasurements.id, measurementIds),
        ),
      );
    for (const row of measurementRows) labelMap.set(row.id, formatMeasurementLinkLabel(row));
  }

  if (labGroupIds.length > 0) {
    const groupRows = await db
      .select({
        id: healthlogLabGroups.id,
        title: healthlogLabGroups.title,
        collectedAt: healthlogLabGroups.collectedAt,
      })
      .from(healthlogLabGroups)
      .where(
        and(
          eq(healthlogLabGroups.tenantId, tenantId),
          eq(healthlogLabGroups.userId, userId),
          inArray(healthlogLabGroups.id, labGroupIds),
        ),
      );
    for (const row of groupRows) labelMap.set(row.id, `${row.title} · ${row.collectedAt}`);
  }

  if (medicationIds.length > 0) {
    const medicationRows = await db
      .select()
      .from(healthlogMedications)
      .where(
        and(
          eq(healthlogMedications.tenantId, tenantId),
          eq(healthlogMedications.userId, userId),
          inArray(healthlogMedications.id, medicationIds),
        ),
      );
    for (const row of medicationRows) {
      labelMap.set(row.id, [row.name, row.dose, row.doseUnit].filter(Boolean).join(' · '));
    }
  }

  return rows.map((row) => ({
    id: row.id,
    notedAt: row.notedAt,
    category: row.category as NoteCategory,
    title: row.title,
    body: row.body,
    linkedType: row.linkedType as NoteLinkType | null,
    linkedId: row.linkedId,
    linkedLabel: row.linkedId ? (labelMap.get(row.linkedId) ?? null) : null,
  }));
}

interface ParsedNoteInput {
  notedAt: number;
  category: NoteCategory;
  title: string;
  body: string;
  linkedType: NoteLinkType | null;
  linkedId: string | null;
}

function parseNoteInput(formData: FormData): ParsedNoteInput | { error: string } {
  const title = formString(formData, 'title');
  if (!title) return { error: 'Enter a title.' };

  const body = formString(formData, 'body');
  if (!body) return { error: 'Enter a note.' };

  const categoryRaw = formString(formData, 'category');
  if (!(NOTE_CATEGORIES as readonly string[]).includes(categoryRaw)) {
    return { error: 'Choose a category.' };
  }
  const category = categoryRaw as NoteCategory;

  const notedAtRaw = formString(formData, 'notedAt');
  const notedAtDate = notedAtRaw ? new Date(notedAtRaw) : new Date();
  if (Number.isNaN(notedAtDate.getTime())) return { error: 'Enter a valid date and time.' };

  const linkedTypeRaw = formString(formData, 'linkedType');
  const linkedIdRaw = formOptionalString(formData, 'linkedId');
  let linkedType: NoteLinkType | null = null;
  if ((NOTE_LINK_TYPES as readonly string[]).includes(linkedTypeRaw) && linkedIdRaw) {
    linkedType = linkedTypeRaw as NoteLinkType;
  }

  return {
    notedAt: Math.floor(notedAtDate.getTime() / 1000),
    category,
    title,
    body,
    linkedType,
    linkedId: linkedType ? linkedIdRaw : null,
  };
}

export async function addNote(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { db, userId, tenantId } = await getContext();
  const parsed = parseNoteInput(formData);
  if ('error' in parsed) return { ok: false, error: parsed.error };

  const ts = now();
  try {
    await db.insert(healthlogNotes).values({
      id: randomUUID(),
      tenantId,
      userId,
      ...parsed,
      createdAt: ts,
      updatedAt: ts,
    });
  } catch {
    return { ok: false, error: 'Could not save this note. Please try again.' };
  }

  revalidatePath('/healthlog/notes');
  return { ok: true, message: 'Note added.' };
}

export async function updateNote(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { db, userId, tenantId } = await getContext();
  const id = formString(formData, 'id');
  if (!id) return { ok: false, error: 'Missing note id.' };

  const parsed = parseNoteInput(formData);
  if ('error' in parsed) return { ok: false, error: parsed.error };

  try {
    await db
      .update(healthlogNotes)
      .set({ ...parsed, updatedAt: now() })
      .where(
        and(eq(healthlogNotes.id, id), eq(healthlogNotes.tenantId, tenantId), eq(healthlogNotes.userId, userId)),
      );
  } catch {
    return { ok: false, error: 'Could not save this note. Please try again.' };
  }

  revalidatePath('/healthlog/notes');
  return { ok: true, message: 'Note updated.' };
}

export async function deleteNote(id: string): Promise<void> {
  const { db, userId, tenantId } = await getContext();
  await db
    .delete(healthlogNotes)
    .where(
      and(eq(healthlogNotes.id, id), eq(healthlogNotes.tenantId, tenantId), eq(healthlogNotes.userId, userId)),
    );
  revalidatePath('/healthlog/notes');
}
