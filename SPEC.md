# HealthLog

**Version:** 0.1\
**Date:** June 2026\
**Author:** kasunben\
**Purpose:** Canonical specification for the Sovereign HealthLog plugin — the single source of truth for its manifest, access model, data model, and build plan.\
**Status:** Draft

---

HealthLog is a simple, privacy-first personal health tracker for Sovereign. It
helps a user keep their basic health profile, body measurements, lab results,
medications, and health notes in one self-hosted place.

The goal is **not** to build a clinical EHR, diagnosis engine, hospital portal,
or complex quantified-self platform. The first version should be the tool a user
can realistically keep updated: a clean personal record that answers common
questions such as "what medications am I taking?", "what was my last LDL?", "how
has my weight changed?", and "what did the doctor say last visit?"

The plugin is `type: sovereign` — maintained in a separate external repository
(`sovereign-healthlog`) and intended as the reference health-data plugin
for owner-scoped, sensitive personal records.

HealthLog is not a medical device and does not provide diagnosis, treatment
recommendations, or emergency guidance. Any assistant-generated explanation or
trend summary must be framed as informational context only.

## Contents

- [Identity and manifest](#identity-and-manifest)
- [Access control](#access-control)
- [Functional requirements](#functional-requirements)
- [Directory structure](#directory-structure)
- [Data model](#data-model)
- [SDK dependencies](#sdk-dependencies)
- [Data contracts](#data-contracts)
- [Portability and deletion](#portability-and-deletion)
- [UI](#ui)
- [Build plan](#build-plan)
- [Open questions](#open-questions)
- [Changelog](#changelog)

---

## Identity and manifest

| Property                           | Value                                                         |
| ---------------------------------- | ------------------------------------------------------------- |
| `id`                               | `fs.sovereign.healthlog`                               |
| `name`                             | `HealthLog`                                                   |
| `type`                             | `sovereign`                                                   |
| `runtime`                          | `native`                                                      |
| `routePrefix`                      | `/healthlog`                                                  |
| `shell`                            | `default`                                                     |
| `adminOnly`                        | omitted (`false`)                                             |
| `icon`                             | `icon.svg`                                                    |
| `permissions`                      | `auth:session`, `db:readWrite`, `data:provide`, `activity:write` |
| `database.requireEncryption`       | `true` (RFC 0071 — raise-only at-rest encryption demand)      |
| `repository`                       | `https://github.com/sovereignfs/sovereign-healthlog`   |
| `compatibility.minPlatformVersion` | `0.44.0`                                                      |

Proposed `manifest.json`:

```json
{
  "schemaVersion": 1,
  "id": "fs.sovereign.healthlog",
  "name": "HealthLog",
  "version": "0.1.0",
  "description": "A private personal health profile, measurements, labs, medications, and notes tracker.",
  "type": "sovereign",
  "runtime": "native",
  "routePrefix": "/healthlog",
  "shell": "default",
  "database": {
    "isolation": "isolated",
    "dialect": "sqlite",
    "requireEncryption": true
  },
  "icon": "icon.svg",
  "permissions": [
    "auth:session",
    "db:readWrite",
    "data:provide",
    "activity:write"
  ],
  "repository": "https://github.com/sovereignfs/sovereign-healthlog",
  "compatibility": {
    "minPlatformVersion": "0.44.0"
  }
}
```

`database.requireEncryption: true` (RFC 0071) demands that the platform's
SQLite at-rest encryption key be set before HealthLog is installed — raise-only,
so this can only add a security guarantee, never remove one the operator has
already enabled instance-wide. Health data is exactly the "worth the operator
friction" case this manifest field exists for: an operator without
`SOVEREIGN_DB_ENCRYPTION_KEY` set gets a clear, plugin-naming refusal at
platform startup, not a silently-unencrypted health record store. Requires
`compatibility.minPlatformVersion` ≥ `0.44.0`, the platform version this
manifest field shipped in — an older platform would not know to enforce it.

`storage:readWrite`, `notifications:send`, and `jobs:*` are intentionally not
required for v0.1. They become relevant when document attachments, medication
reminders, and scheduled follow-ups are added.

---

## Access control

HealthLog is available to authenticated users who can launch installed plugins.
There is no admin-only gate.

All data is **owner-scoped** by default: a user sees only their own health
records. Every table carries `tenant_id` and `user_id`.

No sharing is included in v0.1. Health data is sensitive enough that the default
sharing model should be export-based rather than collaborative. Later versions
may add explicit doctor/family sharing, but only with narrow scopes, expiry, and
clear revocation.

Admin users do not get special access to other users' HealthLog records through
the plugin UI.

HealthLog's manifest sets `database.requireEncryption: true` (RFC 0071): its
isolated SQLite database must be encrypted at rest, and the platform enforces
this at startup — raise-only, so it demands more than the instance-wide
default rather than opting out of it. Health data is exactly the case this
field exists for. This protects a stolen disk, leaked volume snapshot, or
copied database file; it does not protect against a compromised running
process or an operator who holds the key (see RFC 0060's client-side
encryption for that tier, and `docs/security.md` on the platform for the
full distinction).

---

## Functional requirements

Requirements are versioned to their milestone. IDs are stable — never renumber
or reuse an HLG-\* id.

### v0.1 — Personal record core

#### Profile

| ID     | Requirement |
| ------ | ----------- |
| HLG-01 | Create and edit the user's health profile: display name, date of birth, sex at birth, gender identity, blood type, preferred measurement units, and notes. |
| HLG-02 | Record height as a dated measurement. The current height is shown on the profile, but history is preserved. |
| HLG-03 | Record emergency context fields: allergies, important conditions, emergency contact name, emergency contact phone, and primary clinician. All fields are optional. |
| HLG-04 | Show a dashboard summary with current height, latest weight, latest blood pressure, active medications, recent labs, and recent notes. |

#### Measurements

| ID     | Requirement |
| ------ | ----------- |
| HLG-10 | Add, edit, and delete body measurements. v0.1 supported measurement types: weight, blood pressure, resting heart rate, body temperature, blood glucose, and custom. |
| HLG-11 | Each measurement has: type, date/time, value, unit, optional second value, optional context, and optional note. Blood pressure uses systolic/diastolic as first/second values. |
| HLG-12 | Preferred units are applied by default. The stored record preserves the unit entered by the user; display conversion can be added later. |
| HLG-13 | Show simple history views per measurement type: latest value, previous value, and chronological table. Charts are deferred to v0.2. |

#### Lab results

| ID     | Requirement |
| ------ | ----------- |
| HLG-20 | Add, edit, and delete lab result groups. A group represents one lab draw/report date and has: collection date, optional report date, lab/provider, title, and notes. |
| HLG-21 | Add lab result items inside a group: test name, value, unit, optional reference range low/high, optional textual reference range, and out-of-range flag. |
| HLG-22 | Support common result value shapes: numeric value, textual value, positive/negative, and "not detected"/"detected". |
| HLG-23 | Allow a user to mark a lab item as favorite/tracked so it appears on the dashboard and trend screens. |
| HLG-24 | Show previous values for the same test name when entering or viewing a result. Matching is name-based in v0.1. |

#### Medications and supplements

| ID     | Requirement |
| ------ | ----------- |
| HLG-30 | Add, edit, archive, and delete medications/supplements. |
| HLG-31 | Medication fields: name, kind (`medication`/`supplement`/`other`), dose, unit, route, frequency text, start date, optional end date, prescribing clinician, pharmacy, and notes. |
| HLG-32 | Medication status is derived as `active`, `ended`, or `archived`. Active medications appear on the dashboard. |
| HLG-33 | Keep medication history rather than overwriting important changes: dose/frequency changes create a new medication version linked by `series_id`. |

#### Notes

| ID     | Requirement |
| ------ | ----------- |
| HLG-40 | Add dated health notes with title, body, date/time, and category. v0.1 categories: general, symptom, appointment, lifestyle, medication, lab, and other. |
| HLG-41 | Notes can optionally link to a medication, lab group, or measurement record. |
| HLG-42 | Notes support plain text in v0.1. Rich text, attachments, and templates are deferred. |

#### Search and export

| ID     | Requirement |
| ------ | ----------- |
| HLG-50 | Search across medication names, lab test names, lab provider, note title/body, and measurement notes. |
| HLG-51 | Export all user data as JSON. |
| HLG-52 | Export a doctor-visit summary as Markdown or PDF-ready HTML containing active medications, allergies, conditions, recent measurements, selected labs, and selected notes. PDF generation can be browser print in v0.1. |

### v0.2 — Trends, reminders, and documents

| ID     | Requirement |
| ------ | ----------- |
| HLG-60 | Add charts for weight, blood pressure, glucose, heart rate, and tracked lab values. |
| HLG-61 | Add medication reminders using platform notifications and scheduled jobs. |
| HLG-62 | Attach files to lab groups and notes using platform plugin storage (RFC 0044). Primary use case: lab PDFs and visit summaries. |
| HLG-63 | Add import from CSV for measurements and labs. |
| HLG-64 | Add user-defined custom measurement types with preferred unit and dashboard visibility. |

### v0.3 — Sharing and assistant support

| ID     | Requirement |
| ------ | ----------- |
| HLG-70 | Add time-limited share packets for clinician visits. Shared packets are generated snapshots, not live database access. |
| HLG-71 | Expose conservative read-only data contracts for approved consumers, with separate contracts for summary, active medications, recent measurements, and tracked labs. |
| HLG-72 | Add assistant-facing tools only after plugin tool contracts are available: create note, add measurement, prepare visit summary, and explain lab trends. All write tools require confirmation. |
| HLG-73 | Add informational lab explanations through the platform assistant/harness layer. Explanations must include source values and must not diagnose or recommend treatment. |

---

## Directory structure

The plugin lives in its own external repository. Structure follows the standard
plugin layout.

```text
sovereign-healthlog/
├── manifest.json
├── icon.svg
├── app/
│   ├── layout.tsx                 # HealthLog shell
│   ├── page.tsx                   # dashboard
│   ├── profile/page.tsx           # profile and emergency context
│   ├── measurements/page.tsx      # measurement history
│   ├── labs/page.tsx              # lab groups list
│   ├── labs/[id]/page.tsx         # lab group detail
│   ├── medications/page.tsx       # active and archived medications
│   ├── notes/page.tsx             # notes list/search
│   └── exports/page.tsx           # JSON and visit summary exports
├── components/
│   ├── DashboardSummary.tsx
│   ├── MeasurementForm.tsx
│   ├── LabGroupForm.tsx
│   ├── LabResultTable.tsx
│   ├── MedicationForm.tsx
│   ├── NoteEditor.tsx
│   └── VisitSummaryBuilder.tsx
├── db/
│   └── schema.ts
├── migrations/
├── lib/
│   ├── lab-matching.ts            # normalized test-name matching
│   ├── units.ts                   # v0.1 display helpers, not full conversion
│   ├── export.ts                  # JSON and visit summary generation
│   └── data-contracts.ts          # v0.3 contract providers
└── package.json
```

---

## Data model

Tables are prefixed `healthlog_`. All tables carry `tenant_id`, `user_id`,
`created_at`, and `updated_at` unless noted otherwise.

### `healthlog_profiles`

One row per user.

| Column                    | Type      | Notes |
| ------------------------- | --------- | ----- |
| `tenant_id`               | string    | Part of unique key with `user_id`. |
| `user_id`                 | string    | Part of unique key with `tenant_id`. |
| `display_name`            | string?   | Optional local display override. |
| `date_of_birth`           | date?     | Optional. |
| `sex_at_birth`            | string?   | Optional. Constrained enum: `female`, `male`, `intersex`, `unspecified`. Resolved open question 1. |
| `gender_identity`         | string?   | Optional. Free text — self-described, resolved open question 1. |
| `blood_type`              | string?   | Optional. |
| `preferred_units`         | json      | Measurement display preferences. |
| `allergies`               | text?     | Optional free text in v0.1. Structured allergies are deferred. |
| `conditions`              | text?     | Optional free text in v0.1. |
| `emergency_contact_name`  | string?   | Optional. |
| `emergency_contact_phone` | string?   | Optional. |
| `primary_clinician`       | string?   | Optional. |
| `notes`                   | text?     | Optional. |
| `created_at`              | timestamp | |
| `updated_at`              | timestamp | |

### `healthlog_measurements`

| Column          | Type      | Notes |
| --------------- | --------- | ----- |
| `id`            | uuid / pk | |
| `tenant_id`     | string    | |
| `user_id`       | string    | |
| `type`          | string    | `height`, `weight`, `blood_pressure`, `heart_rate`, `temperature`, `glucose`, or custom key. |
| `measured_at`   | timestamp | User-entered measurement time. |
| `value`         | decimal   | Primary value. |
| `value2`        | decimal?  | Secondary value for blood pressure or custom compound measurements. |
| `unit`          | string    | Unit entered by the user. |
| `context`       | string?   | Optional: fasting, seated, morning, after exercise, etc. |
| `note`          | text?     | Optional. |
| `source`        | string    | `manual` in v0.1. Future: `import`, `device`. |
| `created_at`    | timestamp | |
| `updated_at`    | timestamp | |

### `healthlog_lab_groups`

| Column          | Type      | Notes |
| --------------- | --------- | ----- |
| `id`            | uuid / pk | |
| `tenant_id`     | string    | |
| `user_id`       | string    | |
| `title`         | string    | Example: "Annual bloodwork". |
| `collected_at`  | date      | Date sample was collected or test was performed. |
| `reported_at`   | date?     | Optional. |
| `provider`      | string?   | Lab, clinic, or doctor office. |
| `notes`         | text?     | Optional. |
| `attachment_id` | string?   | Optional storage reference once RFC 0044 is available. |
| `created_at`    | timestamp | |
| `updated_at`    | timestamp | |

### `healthlog_lab_results`

| Column                    | Type      | Notes |
| ------------------------- | --------- | ----- |
| `id`                      | uuid / pk | |
| `tenant_id`               | string    | |
| `user_id`                 | string    | |
| `group_id`                | uuid      | FK to `healthlog_lab_groups`. |
| `test_name`               | string    | User-visible name. |
| `normalized_test_name`    | string    | Lowercase normalized key for trend matching. |
| `value_kind`              | string    | `numeric`, `text`, `positive_negative`, `detected_not_detected`. |
| `numeric_value`           | decimal?  | Present when `value_kind = numeric`. |
| `text_value`              | string?   | Present for textual or categorical values. |
| `unit`                    | string?   | Optional. |
| `reference_low`           | decimal?  | Optional numeric lower bound. |
| `reference_high`          | decimal?  | Optional numeric upper bound. |
| `reference_text`          | string?   | Optional textual range, e.g. "< 5.7". |
| `flag`                    | string?   | `low`, `high`, `critical`, `abnormal`, or null. User-entered in v0.1. |
| `tracked`                 | boolean   | Whether this test appears in summary/trend views. |
| `note`                    | text?     | Optional. |
| `created_at`              | timestamp | |
| `updated_at`              | timestamp | |

### `healthlog_medications`

| Column                 | Type      | Notes |
| ---------------------- | --------- | ----- |
| `id`                   | uuid / pk | |
| `tenant_id`            | string    | |
| `user_id`              | string    | |
| `series_id`            | uuid      | Stable across versions of the same medication. |
| `name`                 | string    | |
| `kind`                 | string    | `medication`, `supplement`, or `other`. |
| `dose`                 | string?   | Free text in v0.1 to avoid unsafe parsing. Example: "10". |
| `dose_unit`            | string?   | Example: `mg`, `mcg`, `ml`, `tablet`. |
| `route`                | string?   | Example: oral, topical, injection. |
| `frequency_text`       | string?   | Free text in v0.1. Example: "once daily at night". |
| `start_date`           | date?     | Optional. |
| `end_date`             | date?     | Optional. |
| `prescribing_clinician` | string?   | Optional. |
| `pharmacy`             | string?   | Optional. |
| `status`               | string    | `active`, `ended`, or `archived`. |
| `notes`                | text?     | Optional. |
| `version_reason`       | string?   | Optional note when a new version is created. |
| `created_at`           | timestamp | |
| `updated_at`           | timestamp | |

### `healthlog_notes`

| Column             | Type      | Notes |
| ------------------ | --------- | ----- |
| `id`               | uuid / pk | |
| `tenant_id`        | string    | |
| `user_id`          | string    | |
| `noted_at`         | timestamp | User-entered note time. |
| `category`         | string    | `general`, `symptom`, `appointment`, `lifestyle`, `medication`, `lab`, or `other`. |
| `title`            | string    | |
| `body`             | text      | Plain text in v0.1. |
| `linked_type`      | string?   | `measurement`, `lab_group`, `medication`, or null. |
| `linked_id`        | uuid?     | Optional linked record id. |
| `attachment_id`    | string?   | Optional storage reference once RFC 0044 is available. |
| `created_at`       | timestamp | |
| `updated_at`       | timestamp | |

---

## SDK dependencies

| SDK surface         | Status       | Usage |
| ------------------- | ------------ | ----- |
| `sdk.auth`          | Stable       | Current user and session scoping. |
| `sdk.db`            | Stable       | Plugin-owned health tables. |
| `sdk.data`          | Experimental | v0.3 read-only data contracts for approved consumers. |
| `sdk.activity`      | Experimental | Record major user actions: export created, summary generated, share packet created. |
| `sdk.storage`       | RFC 0044     | v0.2 file attachments for lab PDFs and visit documents. |
| `sdk.notifications` | Experimental | v0.2 medication reminders and follow-up reminders. |
| `sdk.jobs`          | RFC 0046     | v0.2 scheduled reminders. |
| `sdk.tools`         | RFC 0047     | v0.3 confirmed assistant actions. |

---

## Data contracts

HealthLog data is highly sensitive. Data contracts should be conservative,
disabled unless explicitly granted by the user, and designed around summaries
rather than broad raw-table access.

Initial contracts for v0.3:

| Contract                           | Shape |
| ---------------------------------- | ----- |
| `healthlog.summary`                | Current profile summary, active medications count/list, latest selected measurements, recent tracked labs. |
| `healthlog.active-medications`     | Active medication names, dose/frequency text, start date, and notes. |
| `healthlog.recent-measurements`    | Recent measurements by type over a user-selected time window. |
| `healthlog.tracked-labs`           | User-marked lab values and dates, limited to tests the user has explicitly marked as tracked. |
| `healthlog.visit-summary`          | Generated summary packet selected by the user for a specific purpose. |

Contracts must include metadata explaining that values are user-entered and not
clinically verified by the platform.

Mutating operations such as "add measurement", "create note", or "archive
medication" are not data contracts. They require plugin tool contracts
(RFC 0047), explicit confirmation, and activity logging.

---

## Portability and deletion

HealthLog must implement export/import/delete participation from the first
usable version because health data is personal and long-lived.

- **Export:** JSON export includes profile, measurements, lab groups/results,
  medications, notes, and metadata. Attachments are referenced in v0.1 and
  included once storage export is available.
- **Visit summary export:** user-selected Markdown or PDF-ready HTML packet for
  doctor visits.
- **Import:** v0.1 supports importing HealthLog JSON. CSV import is v0.2 and
  starts with measurements/labs only.
- **Delete:** deleting a user's HealthLog data removes all profile,
  measurement, lab, medication, and note records owned by that user. Future
  attachments must be deleted through `sdk.storage`.
- **Audit metadata:** export/share activity logs can remain in platform
  activity history, but should not include health record contents.

---

## UI

HealthLog should feel quiet, clinical enough to trust, and fast enough for
routine use. It should avoid decorative health imagery and avoid presenting
itself as an analyzer or doctor.

Primary navigation:

- **Dashboard** — latest measurements, active medications, recent labs, recent
  notes, and quick add actions.
- **Profile** — demographics, emergency context, allergies, conditions, and
  preferred units.
- **Measurements** — add measurement, view latest/history by type.
- **Labs** — lab reports/groups and individual result rows.
- **Medications** — active, ended, archived.
- **Notes** — dated notes and search.
- **Exports** — full JSON export and visit summary builder.

Design notes:

- Use dense tables for lab results and medication history.
- Use simple forms with clear date/unit fields.
- Avoid diagnosis language in UI copy.
- Show provenance: manual entry, import, or attachment source.
- Favor "tracked" and "favorite" controls over automated interpretation.
- Dashboard cards should be compact repeated items, not large marketing panels.

---

## Build plan

### Phase 1 — Core personal record (HLG-01–52)

Requires Sovereign platform ≥ v0.10.0.

1. Scaffold plugin repository and manifest.
2. Implement schema and migrations for profile, measurements, lab groups/results,
   medications, and notes.
3. Build dashboard and primary CRUD screens.
4. Implement search.
5. Implement JSON export and HealthLog JSON import.
6. Implement visit summary export as Markdown/PDF-ready HTML.
7. Add activity logs for export/summary generation.

### Phase 2 — Trends, reminders, and documents (HLG-60–64)

Depends on RFC 0044 storage and RFC 0046 jobs for the full scope.

1. Add charts for selected measurements and tracked labs.
2. Add medication reminders with `sdk.notifications` and `sdk.jobs`.
3. Add file attachments for lab reports and notes through `sdk.storage`.
4. Add CSV import for measurements and labs.
5. Add custom measurement types.

### Phase 3 — Sharing and assistant support (HLG-70–73)

Depends on RFC 0047 plugin tool contracts and the platform assistant/harness
layer.

1. Add generated visit share packets with explicit expiry.
2. Add conservative read-only data contracts.
3. Add confirmed assistant tools for low-risk write actions.
4. Add informational lab trend explanations with strict non-diagnostic copy.

---

## Open questions

1. **Profile fields:** ✅ Resolved (HL-01) — split, not one shared shape.
   `sex_at_birth` is a small constrained enum (`female`/`male`/`intersex`/
   `unspecified`): it has real clinical relevance (some lab reference ranges
   and drug dosing are sex-linked), and free text would fragment values in a
   way that defeats that purpose. `gender_identity` stays free text — it's a
   personal, self-described field with no universally-correct fixed value
   set, and forcing an enum there would be actively exclusionary. Both remain
   fully optional.
2. **Units:** ✅ Resolved (HL-01) — store exactly as entered, no normalized
   canonical column in v0.1. Matches HLG-12 as written and `lib/units.ts`'s
   own scope note ("display helpers, not full conversion"). A normalized
   column added speculatively now would be a guess at what v0.2 charting
   (HLG-60) actually needs; better to let that task add it once the chart
   requirements (single-unit series vs. render-time conversion vs.
   unit-grouped display) are concrete. Flagged as a known input to HL-14.
3. **Medication modeling:** ✅ Resolved (HL-01) — dose/frequency stay free
   text in v0.1, matching the data model's existing `dose`/`frequency_text`
   columns and their "avoid unsafe parsing" rationale. Structured schedules
   are introduced alongside reminders in v0.2 (HL-18), once the actual
   scheduling requirements (`sdk.jobs`, RFC 0046) are available to design
   against — building a schedule structure now would likely be reworked once
   that requirement is concrete.
4. **Lab templates:** ✅ Resolved (HL-01) — a small local suggestion
   dictionary (~40 common test names with typical unit, e.g. "LDL
   Cholesterol" → mg/dL, "HbA1c" → %, "TSH" → mIU/L), used only as
   client-side autocomplete in `lib/lab-matching.ts`. Never required or
   enforced — any free-text name remains valid — but nudging toward
   consistent naming directly improves HLG-24's name-based previous-value
   matching, and it's a static list with no external terminology API or PHI
   leaving the browser.
5. **Sensitive data contracts:** should HealthLog expose any data contracts by
   default, or require an explicit per-contract opt-in from inside HealthLog?
6. **Admin support:** should admins be able to see aggregate plugin health
   metrics without seeing health contents?
7. **Name:** ✅ Resolved (HL-00) — HealthLog confirmed; this repository was
   created under that name.

---

## Changelog

- **0.1 (June 2026):** Initial proposal.
- **0.2 (July 2026):** `database.requireEncryption: true` added (RFC 0071) —
  HealthLog now demands platform-enforced at-rest encryption for its isolated
  database; `compatibility.minPlatformVersion` raised to `0.44.0` accordingly.
