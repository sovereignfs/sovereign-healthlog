# Sovereign HealthLog — Roadmap

Dependency-ordered task queue for building the Sovereign HealthLog plugin.
Each task is scoped to **one branch = one PR**, small enough for an AI agent
to pick up with minimal supervision. Full requirements: [SPEC.md](SPEC.md).
Requirement IDs (`HLG-*`) are the spec's own stable IDs — never renumbered or
reused; the `HL-*` IDs below are this roadmap's build-order sequencing, one
level more granular than the spec's phase groupings.

## How to read this file

- Tasks are **sequenced** — don't start a task whose `Depends on` isn't ✅,
  unless tagged `[parallel]`.
- Status: `⬜ not started` / `🟨 in progress` / `✅ done` / `🚫 blocked`.
- **Platform readiness check (done against `claude-sv`'s `docs/roadmap.md` as
  of 2026-07-16):** `sdk.auth`, `sdk.db`, `sdk.activity` (RFC 0005),
  `sdk.storage` (RFC 0044), `sdk.notifications` (RFC 0015/0016),
  `sdk.portability` (RFC 0007/0033), and `sdk.data` (RFC 0002) are all
  **implemented and active** on the platform today — not stubs. This is one
  version ahead of what SPEC.md's SDK-dependencies table assumes: it marks
  `sdk.data` "Experimental," but RFC 0002 shipped as a real, active surface
  (platform task 0.5.10). That means **Phase 3's data contracts (HL-21) are
  not platform-blocked** — v0.3 defers them for the product reason SPEC.md
  gives (health data is sensitive; sharing should be a deliberate, later
  decision), not because the SDK isn't ready.
- **Genuinely platform-blocked:** `sdk.jobs` (RFC 0046) and `sdk.tools`
  (RFC 0047) are both `📋` unscheduled in `claude-sv`. Two tasks below
  (HL-18 medication reminders, HL-22 assistant tools) cannot start until
  those land upstream — marked `🚫 blocked`, not sequencing placeholders.
  HL-23 (lab trend explanations) additionally needs the Sovereign Harness
  platform plugin (RFC 0040), also unscheduled.
- Manifest `compatibility.minPlatformVersion` is `0.10.0`; the platform is
  already at `0.19.0`, so there's no version-floor blocker anywhere in this
  roadmap.

---

## Phase 0 — Plugin repo bootstrap

| ID | Task | Depends on | Status |
| --- | --- | --- | --- |
| HL-00 | Bootstrap this repo: `package.json`, `tsconfig` (extend `@sovereignfs/tsconfig`), manifest.json per SPEC's proposed manifest (id `fs.sovereign.healthlog`, `type: sovereign`, `shell: default`, `database.isolation: isolated`/`dialect: sqlite`), `icon.svg`, README pointing to SPEC.md + this roadmap. Confirm SPEC open question 7 (plugin name) is settled — this repo/directory is already named `sovereign-healthlog`, so treat that as the working decision unless the developer says otherwise. | — | ✅ |

---

## Phase 1 — v0.1 personal record core (HLG-01–52)

No platform blockers — every SDK surface this phase needs (`sdk.auth`,
`sdk.db`, `sdk.activity`, `sdk.portability`) is already live.

| ID | Task | Depends on | Status |
| --- | --- | --- | --- |
| HL-01 | Resolve SPEC open questions 1–4 (`sex_at_birth`/`gender_identity` shape, units storage, medication dose/frequency structure, lab-name suggestions) before schema is cut — these are schema-shaping decisions, not UI polish. | HL-00 | ✅ |
| HL-02 | DB schema + migrations for all six `healthlog_*` tables (profiles, measurements, lab_groups, lab_results, medications, notes) per SPEC's data model, `tenant_id`/`user_id` scoped throughout. | HL-01 | ✅ |
| HL-03 | Profile screen: demographics, preferred units, emergency context fields (allergies, conditions, emergency contact, primary clinician), dated height entries (HLG-01–03). | HL-02 | ✅ |
| HL-04 | Measurements CRUD (weight, blood pressure, resting heart rate, temperature, glucose, custom) + per-type history view (latest/previous/chronological table) (HLG-10–13). `[parallel]`-safe with HL-05/06/07/08. | HL-02 | ✅ |
| HL-05 | Lab groups + lab result items CRUD, including the four value shapes (numeric/text/positive-negative/detected-not-detected), tracked/favorite flag, and name-based "previous value for this test" lookup (HLG-20–24). `[parallel]`-safe with HL-04/06/07/08. | HL-02 | ✅ |
| HL-06 | Medications/supplements CRUD with archive, derived status (`active`/`ended`/`archived`), and version-on-change via `series_id` (HLG-30–33). `[parallel]`-safe with HL-04/05/07/08. | HL-02 | ⬜ |
| HL-07 | Notes CRUD: dated, categorized, optional link to a measurement/lab group/medication (HLG-40–42). `[parallel]`-safe with HL-04/05/06/08. | HL-02 | ⬜ |
| HL-08 | Dashboard summary: current height, latest weight, latest blood pressure, active medications, recent labs, recent notes, quick-add actions (HLG-04). | HL-04, HL-05, HL-06, HL-07 | ⬜ |
| HL-09 | Search across medication names, lab test names/provider, note title/body, and measurement notes (HLG-50). | HL-04, HL-05, HL-06, HL-07 | ⬜ |
| HL-10 | Data portability: JSON export (profile, measurements, lab groups/results, medications, notes) and HealthLog-JSON import, registered via `sdk.portability` (mirrors `sovereign-tasks`'/`sovereign-wallet`'s own `app/_lib/portability.ts` pattern — export/import/delete handlers, `data:export`/`data:import` permissions). Delete participation (removes all owner data) ships in the same task since it's the same registration call (HLG-51, plus the Portability-and-deletion section's delete requirement). | HL-08, HL-09 | ⬜ |
| HL-11 | Visit-summary export: user-selected Markdown or PDF-ready HTML packet (active medications, allergies, conditions, recent measurements, selected labs, selected notes); PDF via browser print in v0.1, no server-side rendering (HLG-52). | HL-08 | ⬜ |
| HL-12 | Activity logging via `sdk.activity` for export/summary-generation events — log the action, never the health content (per SPEC's audit-metadata note). | HL-10, HL-11 | ⬜ |
| HL-13 | v0.1 hardening pass: tenant/owner-scoping test sweep across all six tables, medication-versioning edge cases (`series_id` linkage on dose/frequency change), export/import round-trip test, delete-cascade test, non-diagnostic-copy review of dashboard/summary strings. | HL-12 | ⬜ |

**v0.1 is feature-complete after HL-13.**

---

## Phase 2 — v0.2 trends, reminders, and documents (HLG-60–64)

Mixed readiness: charts, attachments, CSV import, and custom types have no
platform blocker. Medication reminders do.

| ID | Task | Depends on | Status |
| --- | --- | --- | --- |
| HL-14 | Charts for weight, blood pressure, glucose, heart rate, and tracked lab values (HLG-60). | HL-13 | ⬜ |
| HL-15 | File attachments on lab groups and notes via `sdk.storage` (RFC 0044, already implemented on the platform) — lab PDFs and visit documents (HLG-62). `[parallel]`-safe with HL-14/16/17. | HL-13 | ⬜ |
| HL-16 | CSV import for measurements and labs, with user-reviewed column mapping (HLG-63). `[parallel]`-safe with HL-14/15/17. | HL-13 | ⬜ |
| HL-17 | User-defined custom measurement types with preferred unit and dashboard visibility (HLG-64). `[parallel]`-safe with HL-14/15/16. | HL-13 | ⬜ |
| HL-18 | Medication reminders via `sdk.notifications` + `sdk.jobs` (HLG-61). | RFC 0046 (`sdk.jobs`, 📋 unscheduled in `claude-sv`) | 🚫 |

**v0.2's non-reminder scope (HL-14–17) is feature-complete without HL-18** —
don't let the reminders blocker hold up the rest of the milestone.

---

## Phase 3 — v0.3 sharing and assistant support (HLG-70–73)

| ID | Task | Depends on | Status |
| --- | --- | --- | --- |
| HL-19 | Resolve SPEC open question 5 (should any data contract be on by default, or strictly per-contract opt-in from inside HealthLog?) before building HL-21 — SPEC's own leaning is opt-in given the sensitivity of health data. | HL-13 | ⬜ |
| HL-20 | Time-limited share packets for clinician visits: generated snapshots with explicit expiry, not live DB access (HLG-70). No platform blocker. | HL-13 | ⬜ |
| HL-21 | Read-only data contracts via `sdk.data` (RFC 0002, already implemented): `healthlog.summary`, `healthlog.active-medications`, `healthlog.recent-measurements`, `healthlog.tracked-labs`, `healthlog.visit-summary` — each conservative, consent-gated per SPEC, with metadata noting values are user-entered and not clinically verified (HLG-71). Not platform-blocked — see the readiness note above. | HL-19, HL-20 | ⬜ |
| HL-22 | Confirmed assistant tools for low-risk write actions (create note, add measurement, prepare visit summary, explain lab trends), all requiring explicit confirmation (HLG-72). | RFC 0047 (`sdk.tools`, 📋 unscheduled in `claude-sv`) | 🚫 |
| HL-23 | Informational, non-diagnostic lab trend explanations through the platform assistant/harness layer, always including source values (HLG-73). | HL-22; RFC 0040 (Sovereign Harness platform plugin, 📋 unscheduled in `claude-sv`) | 🚫 |

---

## Deferred / optional (not blocking)

- **HL-24** — Resolve SPEC open question 6 (should admins see aggregate
  HealthLog plugin-health metrics without seeing record contents?). No
  requirement ID depends on this; revisit only if platform-wide admin
  observability work reaches this plugin.

---

## Changelog

| Date | Change |
| --- | --- |
| 2026-07-16 | Initial roadmap, derived from SPEC.md v0.1 (Draft) plus a `claude-sv` platform-readiness audit (`docs/roadmap.md` as of this date). |
| 2026-07-16 | HL-00 done: repo bootstrap — `package.json`, `tsconfig.json` (extends `@sovereignfs/tsconfig/nextjs.json`), `manifest.json`, `icon.svg`, `.gitignore`, `LICENSE` (AGPL-3.0-or-later), `README.md`, and a minimal `app/page.tsx` home route, matching the `sovereign-wallet`/`sovereign-tasks` external-plugin bootstrap conventions. `minPlatformVersion` set to `0.19.0` (the platform's current version) rather than SPEC's draft `0.10.0` floor. Manifest permissions deliberately trimmed to `auth:session`+`db:readWrite` only — SPEC's proposed manifest also lists `data:provide`/`activity:write` up front, but those aren't exercised until later phases (HL-12 activity logging, HL-21 data contracts); added to the manifest when those tasks land, not before, matching how `sovereign-wallet` grew its own permission list incrementally rather than over-asking at install time. No CI workflow — neither `sovereign-tasks` nor `sovereign-plainwrite` carry one, and `sovereign-wallet` removed its own after bootstrap. |
| 2026-07-16 | HL-01 done: resolved SPEC open questions 1–4 inline in SPEC.md (matching `sovereign-wallet`'s own "✅ Resolved (task-id) — ..." convention), plus open question 7 (name) retroactively since HL-00 already settled it. **OQ1:** `sex_at_birth` is a constrained enum (`female`/`male`/`intersex`/`unspecified` — clinically relevant, e.g. lab reference ranges); `gender_identity` stays free text (self-described, no correct fixed set) — updated the `healthlog_profiles` data-model rows to match. **OQ2:** no normalized-unit column in v0.1 — store exactly as entered (matches HLG-12 and `lib/units.ts`'s existing "display helpers, not full conversion" scope note); deferred to HL-14 once v0.2's actual charting requirements are concrete. **OQ3:** dose/frequency stay free text in v0.1 (matches the data model's existing columns); structured schedules deferred to HL-18 alongside real reminder requirements. **OQ4:** a small (~40-entry) local suggestion dictionary in `lib/lab-matching.ts`, client-side autocomplete only, never required — chosen because it directly improves HLG-24's name-based matching without adding real complexity or an external terminology dependency. No schema/roadmap changes needed beyond the two data-model row edits — OQ2–4 confirmed the spec's existing default rather than changing it. |
| 2026-07-16 | HL-02 done: Drizzle schema for all six `healthlog_*` tables (`app/_db/schema.ts`, re-exported from `db/schema.ts` for `drizzle-kit generate`, mirroring `sovereign-wallet`'s split) + generated SQLite migration (`migrations/sqlite/0000_little_matthew_murdock.sql`). `healthlog_profiles` uses a composite `(tenant_id, user_id)` primary key (one row per user, per SPEC). Every other table is tenant/user-scoped with a `tenant_id, user_id` index at minimum, plus query-shaped indexes: `(tenant_id, user_id, type)` on measurements, `(tenant_id, user_id, normalized_test_name)` and `(..., tracked)` on lab results (HLG-24's previous-value lookup and the dashboard's tracked-labs view), `(tenant_id, user_id, series_id)` and `(..., status)` on medications (HLG-33 versioning and the dashboard's active-medications query). `measurements.type` is deliberately plain `text`, not a drizzle enum — stays open-ended for v0.2's user-defined custom types (HLG-64). `attachment_id` on lab_groups/notes is plain `text`, not an FK — nothing to reference until `sdk.storage` objects exist for this plugin (HL-15). Date-only fields (`date_of_birth`, `collected_at`, `reported_at`, `start_date`, `end_date`) are `text` ISO date strings, not `integer` timestamps, to avoid spurious timezone drift on values that never had a time-of-day component — documented as a schema comment since it deviates from this file's own `created_at`/`updated_at` convention. Added `drizzle-orm`/`drizzle-kit` (same pinned versions as `sovereign-wallet`, not workspace-catalog'd — the root catalog only covers shared toolchain, not per-package feature deps) and a `db:generate` script. Verified live: `pnpm generate` composed the plugin into `runtime/generated/registry.ts` and the `/healthlog` route tree with no errors; `pnpm dev` auto-provisioned the isolated SQLite store (`data/plugins/fs.sovereign.healthlog.db`) and applied the migration cleanly (`sqlite3 ... .tables` confirms all six tables); `/healthlog` rendered the bootstrap home page with a live authenticated session. `pnpm typecheck` clean. |
| 2026-07-16 | HL-03 done: Profile screen (`app/profile/page.tsx`) — demographics/preferred-units/emergency-context form (`ProfileForm`, upsert via `onConflictDoUpdate` on the composite PK) plus a dated-height widget (`HeightSection`: current + short history + add-entry form, writing `healthlog_measurements` rows with `type: 'height'`). Deliberately minimal on height: add-only, no edit/delete — those come for free once HL-04's general measurement CRUD covers `type: 'height'` too, so this task doesn't duplicate that logic. `preferredUnits` (`app/_lib/units.ts`) settles on four unit dimensions (height/weight/temperature/glucose — blood pressure and heart rate have no unit choice) as JSON in `healthlog_profiles.preferred_units`; this shape is now load-bearing for HL-04/HL-14. Used native `Input type=\"date\"` rather than the DS's `DatePicker` for both date fields — nothing in this plugin uses `DatePicker` yet, and its calendar-popover affordance isn't needed for a single free-entry date; revisit if a later task needs range-bounded picking. Followed the `sv-ui-design` skill's ActionResult/`useActionState` convention exactly (ActionResult type, inline `role=\"status\"` error/success banners, pending-label buttons) rather than wallet's crypto-driven manual-`useTransition` variant, since no client-side pre-processing is needed here. Added the repo's first `app/error.tsx` boundary (mirrors `sovereign-plainwrite`'s) and a local `BackLink` component (mirrors `sovereign-wallet`'s) — both were gaps relative to the skill's checklist, worth closing now rather than deferring. Home page (`app/page.tsx`) gained a "Go to your profile →" link so the new screen is actually reachable (no dashboard yet — HL-08 replaces this placeholder home page). Verified live end-to-end: filled and saved the profile form (confirmed the success banner, confirmed values survived a reload, confirmed the DB row directly via `sqlite3`), added a valid height entry (current-height display updated, DB row correct), and exercised the error path — submitting a zero height correctly renders the inline error and leaves the DB untouched, matching the skill's "reproduce the failure paths on purpose" instruction. Also checked at 375px mobile width — the two-column grids collapse to one column cleanly. `pnpm lint`/`format:check`/`typecheck` all clean. |
| 2026-07-17 | HL-04 done: general measurement CRUD (`app/measurements/page.tsx`) — `Tabs` across the six fixed types plus one tab per distinct custom type in use (HLG-10's "or custom key": selecting "Custom…" reveals a free-text type-name field that becomes the stored `type` directly; v0.2's HLG-64 is the separate, later step of making custom types a managed, reusable, unit-remembering entity). Per-type view is latest/previous summary cards plus the full chronological table (HLG-13), each row with Edit (`EditMeasurementDialog`) and Delete (`DeleteMeasurementButton` + DS `ConfirmDialog`). `MeasurementFormFields` is shared between add/edit; both dialogs gate their form-owning child on `open` so the `useActionState` call fully unmounts on close instead of needing a manual reset — the simplest correct way to discard a stale error/success state before the next open. Blood pressure's second value field and the custom type-name field both appear/disappear based on the Type select's live value; Unit is a plain text `Input` (not a `Select`) since custom types need arbitrary units, remounted via `key={typeChoice}` so its `defaultValue` recomputes from `defaultUnitForType()` whenever the type changes. **Found and fixed two bugs while building this, not after:** (1) exported `FIXED_MEASUREMENT_TYPES`/`MEASUREMENT_TYPE_LABELS` as runtime consts from `actions.ts` — a `'use server'` file may only export async functions; moved both into a new `app/_lib/measurementTypes.ts`, caught immediately by the dev-server's own runtime error page. (2) `addHeightEntry` (HL-03) parsed its date-only input with `new Date('YYYY-MM-DD')`, which the spec defines as UTC midnight, not local midnight — for a user west of UTC that silently stores the previous local day; added `parseLocalDateOnly()` to `formUtils.ts` and fixed the call site (this environment is UTC+2, which is why the bug wasn't visible in HL-03's own live verification — positive-offset timezones don't shift). Also fixed `HeightSection`'s date-input default (`toISOString().slice(0,10)`, same UTC-vs-local issue) and added a "Full history →" link from the Profile height widget to this screen, since HL-03 deliberately left height edit/delete for this task to cover. **Found and fixed a third bug during live verification** (not just the happy path): deleting the last entry of a custom type removed its tab from the strip but left the view's `selected` state pointing at the now-gone type — stuck showing that type's empty state with no tab visibly active and no obvious way back. Fixed with a `useEffect` in `MeasurementsView` that falls back to the first remaining tab whenever `selected` isn't in the current `tabItems`. Verified live end-to-end: added a blood-pressure entry (systolic/diastolic + `mmHg` default unit), added and edited a custom "VO2 max" type, deleted it and confirmed the ConfirmDialog copy and the fallback-tab fix, added a second custom type ("Sleep hours") to double-check the fallback under fresh dev-server state, and confirmed the 375px table/tabs both scroll horizontally in their own containers rather than the page. `pnpm lint`/`format:check`/`typecheck` all clean. |
| 2026-07-17 | HL-05 done: lab groups + lab result CRUD (`app/labs/page.tsx` list, `app/labs/[id]/page.tsx` detail). Creating a group redirects straight into its detail page (`redirect()` called outside the insert's try/catch, matching `sovereign-wallet`'s `createCard` pattern — a broad catch would otherwise swallow the redirect's internal control-flow exception as a save failure) since the point of a group is to start adding results into it. Group deletion cascades to its results via **sequential delete-then-delete, not `db.transaction()`** — `sovereign-plainwrite`'s `actions.ts` already documents that better-sqlite3's `transaction()` rejects an async callback at runtime even though the SDK's dialect-agnostic `Db` type lets it type-check; same fix applied here with the same comment. All four HLG-22 value shapes (numeric, text, positive/negative, detected/not-detected) share one `LabResultFormFields` component that swaps the value-entry field based on the live `valueKind` selection; `formatLabResultValue()` (`app/_lib/labFormat.ts`, kept out of `actions.ts` for the same "'use server' can only export async functions" reason as `measurementTypes.ts` in HL-04) renders all four consistently in both the table and the previous-value hint. Test name uses the DS's `SuggestionInput` against the ~40-entry local dictionary resolved in HL-01 (`app/_lib/labMatching.ts`) — controlled state mirrored into a hidden `<input name="testName">` since `SuggestionInput` (like `Checkbox`, also used here for the tracked toggle) has no native form `name`/`value`. HLG-24's previous-value lookup (`getPreviousLabResults`) is debounced 400ms client-side and joins `lab_results`→`lab_groups` to order by collection date; shown as a hint inside the add/edit form, not as a separate "viewing" surface — v0.1 has no dedicated trend view (that's v0.2's HLG-60 charts), and the result already surfaces across whichever groups the user browses. Tracked/favorite (HLG-23) is a lightweight per-row toggle button (`ToggleLabResultTrackedButton`, `★ Tracked`/`☆ Track`) independent of the edit dialog, not requiring a full form round-trip to flip. **Found and fixed a real bug before it shipped, not during review:** all of HL-03/HL-04's `revalidatePath()` calls used bare paths (`'/profile'`, `'/measurements'`) instead of the full route-prefixed path this plugin is actually mounted under (`/healthlog/profile`, `/healthlog/measurements`) — `sovereign-wallet`'s own actions.ts always includes the full `/wallet/...` prefix. Same-page updates still looked correct in HL-03/HL-04's own live testing because React's server-action mechanism auto-refreshes the *current* route regardless of `revalidatePath`'s argument, masking the bug — but it meant cross-page caches (e.g. Profile's cached Height widget after editing height from Measurements) would go stale until some unrelated cache-bust. Fixed all eight call sites in `actions.ts` before adding any new ones for labs, so every `revalidatePath` in this file is now consistently prefixed. Verified live end-to-end (session was interrupted mid-verification and resumed cleanly from the uncommitted working tree): created a lab group (confirmed the create→redirect flow), added a numeric LDL Cholesterol result with a reference range, toggled it tracked (confirmed in the DB directly), created a second group with a follow-up LDL result and confirmed the previous-value hint showed the first group's value and date, exercised `positive_negative` (add, edit from negative→positive) and `detected_not_detected` and `text` value kinds, deleted a single result (confirmed the DB row was gone, no orphan), and deleted an entire group (confirmed the redirect back to `/healthlog/labs` and confirmed via `sqlite3` that the cascade actually removed its results, not just the group row — no orphaned rows left under a nonexistent `group_id`). Also hit a transient dev-server "Failed to fetch" mid-verification (the dev server had died between session resume and the first mutation attempt, unrelated to this code — confirmed via `lsof` finding nothing on the port) and confirmed the app's own `error.tsx` boundary degraded gracefully rather than showing a raw crash; restarted the server and the same flow completed normally. Checked 375px mobile width for both the list and detail pages — table and destructive-styled Delete button both render correctly, table scrolls horizontally in its own container. `pnpm lint`/`format:check`/`typecheck` all clean. |
