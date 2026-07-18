import { sdk } from '@sovereignfs/sdk';
import type {
  DeletionContext,
  DeletionResult,
  ExportContext,
  ImportContext,
  PluginExportSection,
} from '@sovereignfs/sdk';
import { and, eq } from 'drizzle-orm';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import {
  healthlogLabGroups,
  healthlogLabResults,
  healthlogMeasurements,
  healthlogMedications,
  healthlogNotes,
  healthlogProfiles,
} from '../_db/schema';
import type { SexAtBirth } from './actions';
import type { LabFlag, LabValueKind } from './labFormat';
import type { MedicationKind, MedicationStatus } from './medications';
import type { NoteCategory, NoteLinkType } from './notes';

type MeasurementSource = 'manual' | 'import' | 'device';

// The SDK intentionally returns an opaque dialect-agnostic DB client.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = BaseSQLiteDatabase<'async', any, any>;

const PLUGIN_ID = 'fs.sovereign.healthlog';
const EXPORT_SCHEMA_VERSION = 1;

function now(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Registers HealthLog's export/import/delete participation (RFC 0007 / RFC
 * 0033, HLG-51 + the Portability-and-deletion section's delete requirement).
 * Must be called from a request-scoped HealthLog route — this repo calls it
 * from `app/layout.tsx`, same as every other request-scoped setup
 * (registrations are in-process and reset on restart).
 */
export async function registerPortabilityHandlers(): Promise<void> {
  await sdk.portability.provideExport(exportHealthLogData);
  await sdk.portability.provideImport(importHealthLogData);
  await sdk.portability.provideDelete(deleteAllHealthLogData);
}

// ---- Export shape ----
// Keyed by each row's *original* id — the import handler remaps every
// plugin-owned id via ctx.remapId, so cross-references below (lab results'
// groupId, notes' linkedId) travel as the original id and get translated at
// import time. tenantId/userId are never included — they belong to the
// account importing the data, not the one that exported it.

interface ExportProfile {
  displayName: string | null;
  dateOfBirth: string | null;
  sexAtBirth: SexAtBirth | null;
  genderIdentity: string | null;
  bloodType: string | null;
  preferredUnits: string;
  allergies: string | null;
  conditions: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  primaryClinician: string | null;
  notes: string | null;
  createdAt: number;
  updatedAt: number;
}

interface ExportMeasurement {
  id: string;
  type: string;
  measuredAt: number;
  value: number;
  value2: number | null;
  unit: string;
  context: string | null;
  note: string | null;
  source: MeasurementSource;
  createdAt: number;
  updatedAt: number;
}

interface ExportLabGroup {
  id: string;
  title: string;
  collectedAt: string;
  reportedAt: string | null;
  provider: string | null;
  notes: string | null;
  /** Referenced only in v0.1 — the underlying `sdk.storage` object isn't
   * migrated, per SPEC's own "included once storage export is available." */
  attachmentId: string | null;
  createdAt: number;
  updatedAt: number;
}

interface ExportLabResult {
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
  createdAt: number;
  updatedAt: number;
}

interface ExportMedication {
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
  status: MedicationStatus;
  notes: string | null;
  versionReason: string | null;
  createdAt: number;
  updatedAt: number;
}

interface ExportNote {
  id: string;
  notedAt: number;
  category: NoteCategory;
  title: string;
  body: string;
  linkedType: NoteLinkType | null;
  linkedId: string | null;
  attachmentId: string | null;
  createdAt: number;
  updatedAt: number;
}

interface HealthLogExportData {
  profile: ExportProfile | null;
  measurements: ExportMeasurement[];
  labGroups: ExportLabGroup[];
  labResults: ExportLabResult[];
  medications: ExportMedication[];
  notes: ExportNote[];
}

async function exportHealthLogData(ctx: ExportContext): Promise<PluginExportSection> {
  const db = (await sdk.db.getClient()) as Db;
  const { userId, tenantId } = ctx;

  const [profileRows, measurementRows, labGroupRows, labResultRows, medicationRows, noteRows] =
    await Promise.all([
      db
        .select()
        .from(healthlogProfiles)
        .where(and(eq(healthlogProfiles.tenantId, tenantId), eq(healthlogProfiles.userId, userId))),
      db
        .select()
        .from(healthlogMeasurements)
        .where(
          and(eq(healthlogMeasurements.tenantId, tenantId), eq(healthlogMeasurements.userId, userId)),
        ),
      db
        .select()
        .from(healthlogLabGroups)
        .where(and(eq(healthlogLabGroups.tenantId, tenantId), eq(healthlogLabGroups.userId, userId))),
      db
        .select()
        .from(healthlogLabResults)
        .where(
          and(eq(healthlogLabResults.tenantId, tenantId), eq(healthlogLabResults.userId, userId)),
        ),
      db
        .select()
        .from(healthlogMedications)
        .where(
          and(eq(healthlogMedications.tenantId, tenantId), eq(healthlogMedications.userId, userId)),
        ),
      db
        .select()
        .from(healthlogNotes)
        .where(and(eq(healthlogNotes.tenantId, tenantId), eq(healthlogNotes.userId, userId))),
    ]);

  const profileRow = profileRows[0];
  const profile: ExportProfile | null = profileRow
    ? {
        displayName: profileRow.displayName,
        dateOfBirth: profileRow.dateOfBirth,
        sexAtBirth: profileRow.sexAtBirth,
        genderIdentity: profileRow.genderIdentity,
        bloodType: profileRow.bloodType,
        preferredUnits: profileRow.preferredUnits,
        allergies: profileRow.allergies,
        conditions: profileRow.conditions,
        emergencyContactName: profileRow.emergencyContactName,
        emergencyContactPhone: profileRow.emergencyContactPhone,
        primaryClinician: profileRow.primaryClinician,
        notes: profileRow.notes,
        createdAt: profileRow.createdAt,
        updatedAt: profileRow.updatedAt,
      }
    : null;

  const measurements: ExportMeasurement[] = measurementRows.map((row) => ({
    id: row.id,
    type: row.type,
    measuredAt: row.measuredAt,
    value: row.value,
    value2: row.value2,
    unit: row.unit,
    context: row.context,
    note: row.note,
    source: row.source,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));

  const labGroups: ExportLabGroup[] = labGroupRows.map((row) => ({
    id: row.id,
    title: row.title,
    collectedAt: row.collectedAt,
    reportedAt: row.reportedAt,
    provider: row.provider,
    notes: row.notes,
    attachmentId: row.attachmentId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));

  const labResults: ExportLabResult[] = labResultRows.map((row) => ({
    id: row.id,
    groupId: row.groupId,
    testName: row.testName,
    normalizedTestName: row.normalizedTestName,
    valueKind: row.valueKind,
    numericValue: row.numericValue,
    textValue: row.textValue,
    unit: row.unit,
    referenceLow: row.referenceLow,
    referenceHigh: row.referenceHigh,
    referenceText: row.referenceText,
    flag: row.flag,
    tracked: row.tracked,
    note: row.note,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));

  const medications: ExportMedication[] = medicationRows.map((row) => ({
    id: row.id,
    seriesId: row.seriesId,
    name: row.name,
    kind: row.kind,
    dose: row.dose,
    doseUnit: row.doseUnit,
    route: row.route,
    frequencyText: row.frequencyText,
    startDate: row.startDate,
    endDate: row.endDate,
    prescribingClinician: row.prescribingClinician,
    pharmacy: row.pharmacy,
    status: row.status,
    notes: row.notes,
    versionReason: row.versionReason,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));

  const notes: ExportNote[] = noteRows.map((row) => ({
    id: row.id,
    notedAt: row.notedAt,
    category: row.category,
    title: row.title,
    body: row.body,
    linkedType: row.linkedType,
    linkedId: row.linkedId,
    attachmentId: row.attachmentId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));

  const data: HealthLogExportData = { profile, measurements, labGroups, labResults, medications, notes };
  return { pluginId: PLUGIN_ID, schemaVersion: EXPORT_SCHEMA_VERSION, data };
}

// ---- Import ----

function isHealthLogExportData(value: unknown): value is HealthLogExportData {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<HealthLogExportData>;
  return (
    Array.isArray(candidate.measurements) &&
    Array.isArray(candidate.labGroups) &&
    Array.isArray(candidate.labResults) &&
    Array.isArray(candidate.medications) &&
    Array.isArray(candidate.notes)
  );
}

async function importHealthLogData(section: PluginExportSection, ctx: ImportContext): Promise<void> {
  if (section.schemaVersion !== EXPORT_SCHEMA_VERSION || !isHealthLogExportData(section.data)) {
    throw new Error('HealthLog import section has an unrecognized shape.');
  }
  const data = section.data;
  const db = (await sdk.db.getClient()) as Db;
  const ts = now();

  // healthlog_profiles is a per-user singleton (PK is tenantId+userId, not a
  // plugin-minted id) — unlike every table below, a second import into the
  // same account would collide on that PK instead of creating a harmless
  // duplicate. "Additive, never wipes" here means never overwriting whatever
  // the user already has, not silently erroring: only seed it when the
  // account doesn't have a profile yet.
  if (data.profile) {
    const existing = await db
      .select({ userId: healthlogProfiles.userId })
      .from(healthlogProfiles)
      .where(
        and(eq(healthlogProfiles.tenantId, ctx.tenantId), eq(healthlogProfiles.userId, ctx.userId)),
      );
    if (existing.length === 0) {
      await db.insert(healthlogProfiles).values({
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        displayName: data.profile.displayName,
        dateOfBirth: data.profile.dateOfBirth,
        sexAtBirth: data.profile.sexAtBirth,
        genderIdentity: data.profile.genderIdentity,
        bloodType: data.profile.bloodType,
        preferredUnits: data.profile.preferredUnits,
        allergies: data.profile.allergies,
        conditions: data.profile.conditions,
        emergencyContactName: data.profile.emergencyContactName,
        emergencyContactPhone: data.profile.emergencyContactPhone,
        primaryClinician: data.profile.primaryClinician,
        notes: data.profile.notes,
        createdAt: data.profile.createdAt,
        updatedAt: ts,
      });
    }
  }

  for (const measurement of data.measurements) {
    await db.insert(healthlogMeasurements).values({
      id: ctx.remapId(measurement.id),
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      type: measurement.type,
      measuredAt: measurement.measuredAt,
      value: measurement.value,
      value2: measurement.value2,
      unit: measurement.unit,
      context: measurement.context,
      note: measurement.note,
      source: measurement.source,
      createdAt: measurement.createdAt,
      updatedAt: ts,
    });
  }

  for (const group of data.labGroups) {
    await db.insert(healthlogLabGroups).values({
      id: ctx.remapId(group.id),
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      title: group.title,
      collectedAt: group.collectedAt,
      reportedAt: group.reportedAt,
      provider: group.provider,
      notes: group.notes,
      attachmentId: group.attachmentId,
      createdAt: group.createdAt,
      updatedAt: ts,
    });
  }

  // Membership checked against *original* ids (not ctx.remapId's minted new
  // ones) — remapId will happily mint an id for any string handed to it, so
  // checking existence here is what keeps a result whose groupId isn't
  // actually part of this export from landing as a dangling reference
  // instead of being skipped. In practice a same-plugin full-account export
  // always includes every group its own results reference; this guards a
  // hand-edited or corrupted import file, not a normal round trip.
  const originalLabGroupIds = new Set(data.labGroups.map((group) => group.id));
  const originalMeasurementIds = new Set(data.measurements.map((measurement) => measurement.id));
  const originalMedicationIds = new Set(data.medications.map((medication) => medication.id));

  for (const result of data.labResults) {
    if (!originalLabGroupIds.has(result.groupId)) continue;
    await db.insert(healthlogLabResults).values({
      id: ctx.remapId(result.id),
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      groupId: ctx.remapId(result.groupId),
      testName: result.testName,
      normalizedTestName: result.normalizedTestName,
      valueKind: result.valueKind,
      numericValue: result.numericValue,
      textValue: result.textValue,
      unit: result.unit,
      referenceLow: result.referenceLow,
      referenceHigh: result.referenceHigh,
      referenceText: result.referenceText,
      flag: result.flag,
      tracked: result.tracked,
      note: result.note,
      createdAt: result.createdAt,
      updatedAt: ts,
    });
  }

  for (const medication of data.medications) {
    await db.insert(healthlogMedications).values({
      id: ctx.remapId(medication.id),
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      // Not a literal FK — a medication's version history is just every row
      // sharing the same seriesId. remapId's per-import stability (same
      // original id => same new id, every call) is what keeps an imported
      // series linked to itself without a separate id map here.
      seriesId: ctx.remapId(medication.seriesId),
      name: medication.name,
      kind: medication.kind,
      dose: medication.dose,
      doseUnit: medication.doseUnit,
      route: medication.route,
      frequencyText: medication.frequencyText,
      startDate: medication.startDate,
      endDate: medication.endDate,
      prescribingClinician: medication.prescribingClinician,
      pharmacy: medication.pharmacy,
      status: medication.status,
      notes: medication.notes,
      versionReason: medication.versionReason,
      createdAt: medication.createdAt,
      updatedAt: ts,
    });
  }

  for (const note of data.notes) {
    // A link to a record that isn't part of this export degrades to no
    // link, same as `listNotes()`'s own read-time behavior for a since-
    // deleted target — the note itself is still worth importing.
    let linkedType: NoteLinkType | null = null;
    let linkedId: string | null = null;
    if (note.linkedType === 'measurement' && note.linkedId && originalMeasurementIds.has(note.linkedId)) {
      linkedType = note.linkedType;
      linkedId = ctx.remapId(note.linkedId);
    } else if (note.linkedType === 'lab_group' && note.linkedId && originalLabGroupIds.has(note.linkedId)) {
      linkedType = note.linkedType;
      linkedId = ctx.remapId(note.linkedId);
    } else if (
      note.linkedType === 'medication' &&
      note.linkedId &&
      originalMedicationIds.has(note.linkedId)
    ) {
      linkedType = note.linkedType;
      linkedId = ctx.remapId(note.linkedId);
    }

    await db.insert(healthlogNotes).values({
      id: ctx.remapId(note.id),
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      notedAt: note.notedAt,
      category: note.category,
      title: note.title,
      body: note.body,
      linkedType,
      linkedId,
      attachmentId: note.attachmentId,
      createdAt: note.createdAt,
      updatedAt: ts,
    });
  }
}

// ---- Delete ----

async function deleteAllHealthLogData(ctx: DeletionContext): Promise<DeletionResult> {
  const db = ctx.db as Db;
  let deleted = 0;

  // Counted via a select before deleting (not delete().returning()) since
  // DeletionResult must report a count. Order doesn't matter for correctness
  // here — SQLite enforces no FK between these tables — but lab results
  // before their groups, and nothing else depends on anything, keeps the
  // shape obviously mirroring the schema's own dependency direction.
  const [
    profileRows,
    measurementRows,
    labResultRows,
    labGroupRows,
    medicationRows,
    noteRows,
  ] = await Promise.all([
    db
      .select({ userId: healthlogProfiles.userId })
      .from(healthlogProfiles)
      .where(and(eq(healthlogProfiles.tenantId, ctx.tenantId), eq(healthlogProfiles.userId, ctx.userId))),
    db
      .select({ id: healthlogMeasurements.id })
      .from(healthlogMeasurements)
      .where(
        and(eq(healthlogMeasurements.tenantId, ctx.tenantId), eq(healthlogMeasurements.userId, ctx.userId)),
      ),
    db
      .select({ id: healthlogLabResults.id })
      .from(healthlogLabResults)
      .where(
        and(eq(healthlogLabResults.tenantId, ctx.tenantId), eq(healthlogLabResults.userId, ctx.userId)),
      ),
    db
      .select({ id: healthlogLabGroups.id })
      .from(healthlogLabGroups)
      .where(and(eq(healthlogLabGroups.tenantId, ctx.tenantId), eq(healthlogLabGroups.userId, ctx.userId))),
    db
      .select({ id: healthlogMedications.id })
      .from(healthlogMedications)
      .where(
        and(eq(healthlogMedications.tenantId, ctx.tenantId), eq(healthlogMedications.userId, ctx.userId)),
      ),
    db
      .select({ id: healthlogNotes.id })
      .from(healthlogNotes)
      .where(and(eq(healthlogNotes.tenantId, ctx.tenantId), eq(healthlogNotes.userId, ctx.userId))),
  ]);

  await Promise.all([
    db
      .delete(healthlogProfiles)
      .where(and(eq(healthlogProfiles.tenantId, ctx.tenantId), eq(healthlogProfiles.userId, ctx.userId))),
    db
      .delete(healthlogMeasurements)
      .where(
        and(eq(healthlogMeasurements.tenantId, ctx.tenantId), eq(healthlogMeasurements.userId, ctx.userId)),
      ),
    db
      .delete(healthlogLabResults)
      .where(
        and(eq(healthlogLabResults.tenantId, ctx.tenantId), eq(healthlogLabResults.userId, ctx.userId)),
      ),
    db
      .delete(healthlogLabGroups)
      .where(and(eq(healthlogLabGroups.tenantId, ctx.tenantId), eq(healthlogLabGroups.userId, ctx.userId))),
    db
      .delete(healthlogMedications)
      .where(
        and(eq(healthlogMedications.tenantId, ctx.tenantId), eq(healthlogMedications.userId, ctx.userId)),
      ),
    db
      .delete(healthlogNotes)
      .where(and(eq(healthlogNotes.tenantId, ctx.tenantId), eq(healthlogNotes.userId, ctx.userId))),
  ]);

  deleted +=
    profileRows.length +
    measurementRows.length +
    labResultRows.length +
    labGroupRows.length +
    medicationRows.length +
    noteRows.length;

  return { deleted };
}
