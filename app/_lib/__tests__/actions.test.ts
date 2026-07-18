import { getTableName, type Table } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// revalidatePath() throws "static generation store missing" outside a real
// Next.js request — every mutating action calls it, so it must be a no-op
// here rather than actually reaching into Next's request-scoped internals.
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

type Row = Record<string, unknown>;
type Condition = { kind: 'eq'; key: string; value: unknown } | { kind: 'and'; conditions: Condition[] };

function toCamel(snake: string): string {
  return snake.replace(/_([a-z0-9])/g, (_match, c: string) => c.toUpperCase());
}

// Same harness as sovereign-wallet's/sovereign-tasks' own actions.test.ts —
// mocks eq()/and() into an interpretable Condition tree so the fake db can
// actually filter rows, which is what a tenant/owner-scoping sweep needs to
// be meaningful (a stub that always returns everything would prove nothing).
vi.mock('drizzle-orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('drizzle-orm')>();
  return {
    ...actual,
    eq: (column: { name: string }, value: unknown): Condition => ({
      kind: 'eq',
      key: toCamel(column.name),
      value,
    }),
    and: (...conditions: Condition[]): Condition => ({ kind: 'and', conditions }),
  };
});

function matches(row: Row, condition?: Condition): boolean {
  if (!condition) return true;
  if (condition.kind === 'eq') return row[condition.key] === condition.value;
  return condition.conditions.every((c) => matches(row, c));
}

let sessionUserId = 'user-1';
let sessionTenantId = 't1';

vi.mock('@sovereignfs/sdk', () => ({
  sdk: {
    auth: { requireSession: vi.fn(async () => ({ user: { id: sessionUserId, tenantId: sessionTenantId } })) },
    db: { getClient: vi.fn(async () => fakeDb) },
    activity: { log: vi.fn(async () => undefined) },
  },
}));

interface Store extends Record<string, Row[]> {
  healthlog_profiles: Row[];
  healthlog_measurements: Row[];
  healthlog_lab_groups: Row[];
  healthlog_lab_results: Row[];
  healthlog_medications: Row[];
  healthlog_notes: Row[];
}

let store: Store = {
  healthlog_profiles: [],
  healthlog_measurements: [],
  healthlog_lab_groups: [],
  healthlog_lab_results: [],
  healthlog_medications: [],
  healthlog_notes: [],
};

function resetStore() {
  store = {
    healthlog_profiles: [],
    healthlog_measurements: [],
    healthlog_lab_groups: [],
    healthlog_lab_results: [],
    healthlog_medications: [],
    healthlog_notes: [],
  };
}

function project(rows: Row[], columns?: Record<string, unknown>): Row[] {
  if (!columns) return rows;
  return rows.map((row) => {
    const projected: Row = {};
    for (const key of Object.keys(columns)) projected[key] = row[key];
    return projected;
  });
}

/** Sorts by `createdAt` descending — the harness doesn't interpret real
 * drizzle `desc()`/column arguments, so every seed in this file sets
 * `createdAt` to reflect the order a real `.orderBy(desc(...))` query
 * would need, and `orderBy()` here is unconditionally "newest first." */
function orderByDesc(rows: Row[]): Row[] {
  return [...rows].sort((a, b) => ((b.createdAt as number) ?? 0) - ((a.createdAt as number) ?? 0));
}

function chain(rows: Row[]) {
  return Object.assign(Promise.resolve(rows), {
    limit: (_n: number) => Promise.resolve(rows),
    returning: (_cols: unknown) => Promise.resolve(rows),
    orderBy: (..._cols: unknown[]) => chain(orderByDesc(rows)),
  });
}

function whereChain(rows: Row[], columns: Record<string, unknown> | undefined) {
  return {
    where: (condition?: Condition) => {
      const filtered = rows.filter((row) => matches(row, condition));
      return chain(project(filtered, columns));
    },
  };
}

const fakeDb = {
  select(columns?: Record<string, unknown>) {
    return {
      from(table: Table) {
        const tableName = getTableName(table);
        const rows = store[tableName] ?? [];
        return whereChain(rows, columns);
      },
    };
  },
  selectDistinct(columns?: Record<string, unknown>) {
    return this.select(columns);
  },
  insert(table: Table) {
    const tableName = getTableName(table);
    return {
      values: async (row: Row) => {
        (store[tableName] ??= []).push(row);
      },
    };
  },
  update(table: Table) {
    const tableName = getTableName(table);
    return {
      set: (patch: Row) => ({
        where: (condition?: Condition) => {
          const matched = (store[tableName] ?? []).filter((row) => matches(row, condition));
          store[tableName] = (store[tableName] ?? []).map((row) =>
            matches(row, condition) ? { ...row, ...patch } : row,
          );
          return Object.assign(Promise.resolve(matched), {
            returning: (_cols: unknown) => Promise.resolve(matched),
          });
        },
      }),
    };
  },
  delete(table: Table) {
    const tableName = getTableName(table);
    return {
      where: async (condition?: Condition) => {
        store[tableName] = (store[tableName] ?? []).filter((row) => !matches(row, condition));
      },
    };
  },
};

function seedMeasurement(overrides: Partial<Row> = {}) {
  const row: Row = {
    id: 'measurement-1',
    tenantId: 't1',
    userId: 'user-1',
    type: 'weight',
    measuredAt: 100,
    value: 72.5,
    value2: null,
    unit: 'kg',
    context: null,
    note: null,
    source: 'manual',
    createdAt: 100,
    updatedAt: 100,
    ...overrides,
  };
  store.healthlog_measurements.push(row);
  return row;
}

function seedLabGroup(overrides: Partial<Row> = {}) {
  const row: Row = {
    id: 'group-1',
    tenantId: 't1',
    userId: 'user-1',
    title: 'Quick check',
    collectedAt: '2026-07-01',
    reportedAt: null,
    provider: null,
    notes: null,
    attachmentId: null,
    createdAt: 100,
    updatedAt: 100,
    ...overrides,
  };
  store.healthlog_lab_groups.push(row);
  return row;
}

function seedLabResult(overrides: Partial<Row> = {}) {
  const row: Row = {
    id: 'result-1',
    tenantId: 't1',
    userId: 'user-1',
    groupId: 'group-1',
    testName: 'Vitamin D',
    normalizedTestName: 'vitamin d',
    valueKind: 'numeric',
    numericValue: 32,
    textValue: null,
    unit: 'ng/mL',
    referenceLow: null,
    referenceHigh: null,
    referenceText: null,
    flag: null,
    tracked: false,
    note: null,
    createdAt: 100,
    updatedAt: 100,
    ...overrides,
  };
  store.healthlog_lab_results.push(row);
  return row;
}

function seedMedication(overrides: Partial<Row> = {}) {
  const row: Row = {
    id: 'med-1',
    tenantId: 't1',
    userId: 'user-1',
    seriesId: 'series-1',
    name: 'Metformin',
    kind: 'medication',
    dose: '500',
    doseUnit: 'mg',
    route: null,
    frequencyText: 'Once daily',
    startDate: null,
    endDate: null,
    prescribingClinician: null,
    pharmacy: null,
    status: 'active',
    notes: null,
    versionReason: null,
    createdAt: 100,
    updatedAt: 100,
    ...overrides,
  };
  store.healthlog_medications.push(row);
  return row;
}

function seedNote(overrides: Partial<Row> = {}) {
  const row: Row = {
    id: 'note-1',
    tenantId: 't1',
    userId: 'user-1',
    notedAt: 100,
    category: 'general',
    title: 'Headache',
    body: 'Mild headache.',
    linkedType: null,
    linkedId: null,
    attachmentId: null,
    createdAt: 100,
    updatedAt: 100,
    ...overrides,
  };
  store.healthlog_notes.push(row);
  return row;
}

function seedProfile(overrides: Partial<Row> = {}) {
  const row: Row = {
    tenantId: 't1',
    userId: 'user-1',
    displayName: 'Ada',
    dateOfBirth: null,
    sexAtBirth: null,
    genderIdentity: null,
    bloodType: null,
    preferredUnits: JSON.stringify({}),
    allergies: null,
    conditions: null,
    emergencyContactName: null,
    emergencyContactPhone: null,
    primaryClinician: null,
    notes: null,
    createdAt: 100,
    updatedAt: 100,
    ...overrides,
  };
  store.healthlog_profiles.push(row);
  return row;
}

beforeEach(() => {
  vi.clearAllMocks();
  resetStore();
  sessionUserId = 'user-1';
  sessionTenantId = 't1';
});

describe('tenant/owner scoping sweep — all six tables', () => {
  it('getProfile returns the empty default for another user in the same tenant', async () => {
    const { getProfile } = await import('../actions');
    seedProfile();
    sessionUserId = 'user-2';

    expect((await getProfile()).displayName).toBe('');
  });

  it('getProfile returns the empty default for the same user id in a different tenant', async () => {
    const { getProfile } = await import('../actions');
    seedProfile();
    sessionTenantId = 't2';

    expect((await getProfile()).displayName).toBe('');
  });

  it('listMeasurementsByType excludes another tenant/user’s rows', async () => {
    const { listMeasurementsByType } = await import('../actions');
    seedMeasurement();
    seedMeasurement({ id: 'm-other-user', userId: 'user-2' });
    seedMeasurement({ id: 'm-other-tenant', tenantId: 't2' });

    const rows = await listMeasurementsByType('weight');
    expect(rows.map((r) => r.id)).toEqual(['measurement-1']);
  });

  it('getLabGroup returns null for another tenant/user’s group', async () => {
    const { getLabGroup } = await import('../actions');
    seedLabGroup();
    sessionUserId = 'user-2';
    expect(await getLabGroup('group-1')).toBeNull();

    sessionUserId = 'user-1';
    sessionTenantId = 't2';
    expect(await getLabGroup('group-1')).toBeNull();
  });

  it('listLabResults excludes another tenant/user’s results for the same group id', async () => {
    const { listLabResults } = await import('../actions');
    seedLabResult();
    seedLabResult({ id: 'result-other-user', userId: 'user-2' });
    seedLabResult({ id: 'result-other-tenant', tenantId: 't2' });

    const rows = await listLabResults('group-1');
    expect(rows.map((r) => r.id)).toEqual(['result-1']);
  });

  it('listMedications excludes another tenant/user’s medications', async () => {
    const { listMedications } = await import('../actions');
    seedMedication();
    seedMedication({ id: 'med-other-user', seriesId: 'series-other-user', userId: 'user-2' });
    seedMedication({ id: 'med-other-tenant', seriesId: 'series-other-tenant', tenantId: 't2' });

    const rows = await listMedications();
    expect(rows.map((r) => r.id)).toEqual(['med-1']);
  });

  it('listNotes excludes another tenant/user’s notes', async () => {
    const { listNotes } = await import('../actions');
    seedNote();
    seedNote({ id: 'note-other-user', userId: 'user-2' });
    seedNote({ id: 'note-other-tenant', tenantId: 't2' });

    const rows = await listNotes();
    expect(rows.map((r) => r.id)).toEqual(['note-1']);
  });
});

describe('medication versioning (HLG-33) — series_id linkage on dose/frequency change', () => {
  it('creates a new version sharing seriesId when dose changes', async () => {
    const { updateMedication } = await import('../actions');
    seedMedication();

    const formData = new FormData();
    formData.set('id', 'med-1');
    formData.set('name', 'Metformin');
    formData.set('kind', 'medication');
    formData.set('dose', '1000');
    formData.set('doseUnit', 'mg');
    formData.set('frequencyText', 'Once daily');

    const result = await updateMedication(null, formData);
    expect(result.ok).toBe(true);
    expect(store.healthlog_medications).toHaveLength(2);
    const seriesIds = new Set(store.healthlog_medications.map((r) => r.seriesId));
    expect(seriesIds).toEqual(new Set(['series-1']));
    const original = store.healthlog_medications.find((r) => r.id === 'med-1');
    expect(original?.dose).toBe('500'); // original row left untouched, not overwritten
  });

  it('creates a new version sharing seriesId when frequency changes', async () => {
    const { updateMedication } = await import('../actions');
    seedMedication();

    const formData = new FormData();
    formData.set('id', 'med-1');
    formData.set('name', 'Metformin');
    formData.set('kind', 'medication');
    formData.set('dose', '500');
    formData.set('doseUnit', 'mg');
    formData.set('frequencyText', 'Twice daily');

    await updateMedication(null, formData);
    expect(store.healthlog_medications).toHaveLength(2);
  });

  it('updates in place (no new version) when only the name changes', async () => {
    const { updateMedication } = await import('../actions');
    seedMedication();

    const formData = new FormData();
    formData.set('id', 'med-1');
    formData.set('name', 'Metformin HCl');
    formData.set('kind', 'medication');
    formData.set('dose', '500');
    formData.set('doseUnit', 'mg');
    formData.set('frequencyText', 'Once daily');

    const result = await updateMedication(null, formData);
    expect(result.ok).toBe(true);
    expect(store.healthlog_medications).toHaveLength(1);
    expect(store.healthlog_medications[0]?.name).toBe('Metformin HCl');
  });

  it('listMedications resolves the latest version as current and counts all versions', async () => {
    const { listMedications } = await import('../actions');
    seedMedication({ id: 'med-1', createdAt: 100, dose: '500' });
    seedMedication({ id: 'med-2', createdAt: 200, dose: '1000' }); // same seriesId, later version

    const rows = await listMedications();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe('med-2');
    expect(rows[0]?.dose).toBe('1000');
    expect(rows[0]?.versionCount).toBe(2);
  });
});

describe('delete-cascade', () => {
  it('deleteLabGroup removes the group and every result under it, scoped to the owner', async () => {
    const { deleteLabGroup } = await import('../actions');
    seedLabGroup();
    seedLabResult({ id: 'result-1' });
    seedLabResult({ id: 'result-2' });
    // A different owner's group/result with the same group id must survive.
    seedLabGroup({ id: 'group-other', userId: 'user-2' });
    seedLabResult({ id: 'result-other', groupId: 'group-other', userId: 'user-2' });

    await expect(deleteLabGroup('group-1')).rejects.toThrow(); // redirect() throws NEXT_REDIRECT
    expect(store.healthlog_lab_groups.map((r) => r.id)).toEqual(['group-other']);
    // The deleted group's own results are gone; another owner's result
    // (even one that happens to reference a different group id) survives.
    expect(store.healthlog_lab_results.map((r) => r.id)).toEqual(['result-other']);
  });

  it('deleteMedicationSeries removes every version in the series, scoped to the owner', async () => {
    const { deleteMedicationSeries } = await import('../actions');
    seedMedication({ id: 'med-1', createdAt: 100 });
    seedMedication({ id: 'med-2', createdAt: 200 });
    seedMedication({ id: 'med-other', seriesId: 'series-other', userId: 'user-2' });

    await deleteMedicationSeries('series-1');
    expect(store.healthlog_medications.map((r) => r.id)).toEqual(['med-other']);
  });
});
