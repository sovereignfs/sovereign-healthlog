import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { index, integer, primaryKey, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * Runtime query schema for HealthLog's personal-record core (v0.1, HLG-01–52).
 *
 * This file intentionally lives under app/ because the Sovereign runtime mounts
 * the plugin app tree into Next routes. Server components/actions must not
 * import runtime query helpers from outside that mounted tree.
 *
 * Date vs. timestamp columns: fields that are a pure calendar date with no
 * time-of-day component (`date_of_birth`, `collected_at`, `reported_at`,
 * `start_date`, `end_date`) are stored as `text` ISO date strings
 * ('YYYY-MM-DD') to avoid spurious timezone drift. Fields that are a genuine
 * point in time (`measured_at`, `noted_at`, `created_at`, `updated_at`) are
 * stored as `integer` epoch-ms, set by the app layer (no DB-generated
 * defaults), matching sovereign-wallet's convention.
 */

export const healthlogProfiles = sqliteTable(
  'healthlog_profiles',
  {
    tenantId: text('tenant_id').notNull(),
    userId: text('user_id').notNull(),
    displayName: text('display_name'),
    dateOfBirth: text('date_of_birth'),
    sexAtBirth: text('sex_at_birth', {
      enum: ['female', 'male', 'intersex', 'unspecified'],
    }),
    genderIdentity: text('gender_identity'),
    bloodType: text('blood_type'),
    /** JSON-stringified measurement display preferences. */
    preferredUnits: text('preferred_units').notNull(),
    allergies: text('allergies'),
    conditions: text('conditions'),
    emergencyContactName: text('emergency_contact_name'),
    emergencyContactPhone: text('emergency_contact_phone'),
    primaryClinician: text('primary_clinician'),
    notes: text('notes'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => [primaryKey({ columns: [t.tenantId, t.userId] })],
);

export const healthlogMeasurements = sqliteTable(
  'healthlog_measurements',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull(),
    userId: text('user_id').notNull(),
    /**
     * `height`, `weight`, `blood_pressure`, `heart_rate`, `temperature`,
     * `glucose`, or `custom` (v0.1, HLG-10). Left as plain text rather than a
     * drizzle enum — v0.2's HLG-64 adds user-defined custom measurement
     * types, an open-ended set a fixed enum can't express.
     */
    type: text('type').notNull(),
    measuredAt: integer('measured_at').notNull(),
    value: real('value').notNull(),
    /** Secondary value — blood pressure diastolic, or a custom compound measurement. */
    value2: real('value2'),
    unit: text('unit').notNull(),
    context: text('context'),
    note: text('note'),
    source: text('source', { enum: ['manual', 'import', 'device'] })
      .notNull()
      .default('manual'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => [
    index('healthlog_measurements_tenant_user_idx').on(t.tenantId, t.userId),
    index('healthlog_measurements_tenant_user_type_idx').on(t.tenantId, t.userId, t.type),
  ],
);

export const healthlogLabGroups = sqliteTable(
  'healthlog_lab_groups',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull(),
    userId: text('user_id').notNull(),
    title: text('title').notNull(),
    collectedAt: text('collected_at').notNull(),
    reportedAt: text('reported_at'),
    provider: text('provider'),
    notes: text('notes'),
    /** `sdk.storage` object key once RFC 0044 attachments land (v0.2, HL-15). */
    attachmentId: text('attachment_id'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => [index('healthlog_lab_groups_tenant_user_idx').on(t.tenantId, t.userId)],
);

export const healthlogLabResults = sqliteTable(
  'healthlog_lab_results',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull(),
    userId: text('user_id').notNull(),
    groupId: text('group_id')
      .notNull()
      .references(() => healthlogLabGroups.id),
    testName: text('test_name').notNull(),
    /** Lowercase-normalized key used for HLG-24's name-based trend matching. */
    normalizedTestName: text('normalized_test_name').notNull(),
    valueKind: text('value_kind', {
      enum: ['numeric', 'text', 'positive_negative', 'detected_not_detected'],
    }).notNull(),
    numericValue: real('numeric_value'),
    textValue: text('text_value'),
    unit: text('unit'),
    referenceLow: real('reference_low'),
    referenceHigh: real('reference_high'),
    referenceText: text('reference_text'),
    flag: text('flag', { enum: ['low', 'high', 'critical', 'abnormal'] }),
    tracked: integer('tracked', { mode: 'boolean' }).notNull().default(false),
    note: text('note'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => [
    index('healthlog_lab_results_group_idx').on(t.groupId),
    index('healthlog_lab_results_tenant_user_name_idx').on(
      t.tenantId,
      t.userId,
      t.normalizedTestName,
    ),
    index('healthlog_lab_results_tenant_user_tracked_idx').on(t.tenantId, t.userId, t.tracked),
  ],
);

export const healthlogMedications = sqliteTable(
  'healthlog_medications',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull(),
    userId: text('user_id').notNull(),
    /** Stable across dose/frequency versions of the same medication (HLG-33). */
    seriesId: text('series_id').notNull(),
    name: text('name').notNull(),
    kind: text('kind', { enum: ['medication', 'supplement', 'other'] }).notNull(),
    /** Free text in v0.1 to avoid unsafe parsing — resolved open question 3. */
    dose: text('dose'),
    doseUnit: text('dose_unit'),
    route: text('route'),
    frequencyText: text('frequency_text'),
    startDate: text('start_date'),
    endDate: text('end_date'),
    prescribingClinician: text('prescribing_clinician'),
    pharmacy: text('pharmacy'),
    status: text('status', { enum: ['active', 'ended', 'archived'] }).notNull(),
    notes: text('notes'),
    versionReason: text('version_reason'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => [
    index('healthlog_medications_tenant_user_series_idx').on(t.tenantId, t.userId, t.seriesId),
    index('healthlog_medications_tenant_user_status_idx').on(t.tenantId, t.userId, t.status),
  ],
);

export const healthlogNotes = sqliteTable(
  'healthlog_notes',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull(),
    userId: text('user_id').notNull(),
    notedAt: integer('noted_at').notNull(),
    category: text('category', {
      enum: ['general', 'symptom', 'appointment', 'lifestyle', 'medication', 'lab', 'other'],
    }).notNull(),
    title: text('title').notNull(),
    body: text('body').notNull(),
    linkedType: text('linked_type', { enum: ['measurement', 'lab_group', 'medication'] }),
    linkedId: text('linked_id'),
    /** `sdk.storage` object key once RFC 0044 attachments land (v0.2, HL-15). */
    attachmentId: text('attachment_id'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => [index('healthlog_notes_tenant_user_idx').on(t.tenantId, t.userId)],
);

export const healthlogTables = {
  healthlogProfiles,
  healthlogMeasurements,
  healthlogLabGroups,
  healthlogLabResults,
  healthlogMedications,
  healthlogNotes,
};

export type HealthlogProfile = InferSelectModel<typeof healthlogProfiles>;
export type NewHealthlogProfile = InferInsertModel<typeof healthlogProfiles>;
export type HealthlogMeasurement = InferSelectModel<typeof healthlogMeasurements>;
export type NewHealthlogMeasurement = InferInsertModel<typeof healthlogMeasurements>;
export type HealthlogLabGroup = InferSelectModel<typeof healthlogLabGroups>;
export type NewHealthlogLabGroup = InferInsertModel<typeof healthlogLabGroups>;
export type HealthlogLabResult = InferSelectModel<typeof healthlogLabResults>;
export type NewHealthlogLabResult = InferInsertModel<typeof healthlogLabResults>;
export type HealthlogMedication = InferSelectModel<typeof healthlogMedications>;
export type NewHealthlogMedication = InferInsertModel<typeof healthlogMedications>;
export type HealthlogNote = InferSelectModel<typeof healthlogNotes>;
export type NewHealthlogNote = InferInsertModel<typeof healthlogNotes>;
