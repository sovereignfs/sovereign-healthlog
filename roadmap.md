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
| HL-02 | DB schema + migrations for all six `healthlog_*` tables (profiles, measurements, lab_groups, lab_results, medications, notes) per SPEC's data model, `tenant_id`/`user_id` scoped throughout. | HL-01 | ⬜ |
| HL-03 | Profile screen: demographics, preferred units, emergency context fields (allergies, conditions, emergency contact, primary clinician), dated height entries (HLG-01–03). | HL-02 | ⬜ |
| HL-04 | Measurements CRUD (weight, blood pressure, resting heart rate, temperature, glucose, custom) + per-type history view (latest/previous/chronological table) (HLG-10–13). `[parallel]`-safe with HL-05/06/07/08. | HL-02 | ⬜ |
| HL-05 | Lab groups + lab result items CRUD, including the four value shapes (numeric/text/positive-negative/detected-not-detected), tracked/favorite flag, and name-based "previous value for this test" lookup (HLG-20–24). `[parallel]`-safe with HL-04/06/07/08. | HL-02 | ⬜ |
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
