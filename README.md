# HealthLog

HealthLog is a Sovereign plugin for a private, personal health record: profile
and emergency context, body measurements, lab results, medications, and dated
health notes. Full requirements: [SPEC.md](SPEC.md). Build sequencing:
[roadmap.md](roadmap.md).

HealthLog is not a medical device and does not provide diagnosis, treatment
recommendations, or emergency guidance.

## Local development

To test this standalone checkout against the platform, clone or copy it into
a platform workspace as a plugin checkout:

```bash
plugins/sovereign-healthlog
```

Then run the platform generate/dev workflow from the platform repository:

```bash
pnpm generate
pnpm dev
```

The app is served at `/healthlog` once composed by the platform.

## Current scope

This repository is at the bootstrap stage (roadmap task HL-00): manifest,
package/tsconfig scaffolding, and this README. No HealthLog functionality is
implemented yet.

v0.1 (the personal record core — profile, measurements, labs, medications,
notes, search, export) has no platform blockers and can start once this
bootstrap task lands. See [roadmap.md](roadmap.md) for the full phase
sequencing, including the two v0.2/v0.3 tasks that are genuinely blocked on
unbuilt platform capability (`sdk.jobs`, `sdk.tools`).

## Identity

| Property     | Value                            |
| ------------ | --------------------------------- |
| Plugin ID    | `fs.sovereign.healthlog`          |
| Route prefix | `/healthlog`                      |
| Permissions  | `auth:session`, `db:readWrite`    |
| Min platform | `0.19.0`                          |
| Table prefix | `healthlog_`                      |
| Database     | isolated SQLite                   |
