import { getTableName, type Table } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  DeletionContext,
  DeletionResult,
  ExportContext,
  ImportContext,
  PluginExportSection,
} from '@sovereignfs/sdk';

type Row = Record<string, unknown>;
type Condition = { kind: 'eq'; key: string; value: unknown } | { kind: 'and'; conditions: Condition[] };

function toCamel(snake: string): string {
  return snake.replace(/_([a-z0-9])/g, (_match, c: string) => c.toUpperCase());
}

// Same harness as actions.test.ts / sovereign-wallet's own portability.test.ts.
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

const capturedExporter = {
  fn: null as ((ctx: ExportContext) => Promise<PluginExportSection>) | null,
};
const capturedImporter = {
  fn: null as ((section: PluginExportSection, ctx: ImportContext) => Promise<void>) | null,
};
const capturedDeleter = {
  fn: null as ((ctx: DeletionContext) => Promise<DeletionResult>) | null,
};

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

function chain(rows: Row[]) {
  return Object.assign(Promise.resolve(rows), {
    limit: (_n: number) => Promise.resolve(rows),
    returning: (_cols: unknown) => Promise.resolve(rows),
  });
}

function whereChain(rows: Row[], columns: Record<string, unknown> | undefined) {
  return {
    where: (condition?: Condition) => {
      const filtered = rows.filter((row) => matches(row, condition));
      if (!columns) return chain(filtered);
      const projected = filtered.map((row) => {
        const p: Row = {};
        for (const key of Object.keys(columns)) p[key] = row[key];
        return p;
      });
      return chain(projected);
    },
  };
}

const fakeDb = {
  select(columns?: Record<string, unknown>) {
    return {
      from(table: Table) {
        const tableName = getTableName(table);
        return whereChain(store[tableName] ?? [], columns);
      },
    };
  },
  insert(table: Table) {
    const tableName = getTableName(table);
    return {
      values: async (row: Row) => {
        (store[tableName] ??= []).push(row);
      },
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

vi.mock('@sovereignfs/sdk', () => ({
  sdk: {
    db: { getClient: vi.fn(async () => fakeDb) },
    portability: {
      provideExport: vi.fn(async (fn: typeof capturedExporter.fn) => {
        capturedExporter.fn = fn;
      }),
      provideImport: vi.fn(async (fn: typeof capturedImporter.fn) => {
        capturedImporter.fn = fn;
      }),
      provideDelete: vi.fn(async (fn: typeof capturedDeleter.fn) => {
        capturedDeleter.fn = fn;
      }),
    },
  },
}));

/** Stable per "import" (same original id -> same new id), matching the
 * platform's real `ctx.remapId` contract (RFC 0007). */
function makeRemapper() {
  const map = new Map<string, string>();
  return (originalId: string): string => {
    let mapped = map.get(originalId);
    if (!mapped) {
      mapped = `new-${originalId}`;
      map.set(originalId, mapped);
    }
    return mapped;
  };
}

function seedFullAccount(tenantId: string, userId: string) {
  store.healthlog_profiles.push({
    tenantId,
    userId,
    displayName: 'Ada',
    dateOfBirth: '1990-01-01',
    sexAtBirth: 'female',
    genderIdentity: null,
    bloodType: null,
    preferredUnits: '{}',
    allergies: 'Penicillin',
    conditions: null,
    emergencyContactName: null,
    emergencyContactPhone: null,
    primaryClinician: null,
    notes: null,
    createdAt: 100,
    updatedAt: 100,
  });
  store.healthlog_measurements.push({
    id: 'measurement-1',
    tenantId,
    userId,
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
  });
  store.healthlog_lab_groups.push({
    id: 'group-1',
    tenantId,
    userId,
    title: 'Quick check',
    collectedAt: '2026-07-01',
    reportedAt: null,
    provider: null,
    notes: null,
    attachmentId: null,
    createdAt: 100,
    updatedAt: 100,
  });
  store.healthlog_lab_results.push({
    id: 'result-1',
    tenantId,
    userId,
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
  });
  store.healthlog_medications.push({
    id: 'med-1',
    tenantId,
    userId,
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
  });
  store.healthlog_notes.push({
    id: 'note-1',
    tenantId,
    userId,
    notedAt: 100,
    category: 'general',
    title: 'Headache',
    body: 'Mild headache, probably dehydration.',
    linkedType: 'lab_group',
    linkedId: 'group-1',
    attachmentId: null,
    createdAt: 100,
    updatedAt: 100,
  });
}

beforeEach(async () => {
  vi.clearAllMocks();
  resetStore();
  const { registerPortabilityHandlers } = await import('../portability');
  await registerPortabilityHandlers();
});

describe('export/import round trip (HL-10/HL-13)', () => {
  it('exports every table scoped to the requesting user/tenant', async () => {
    seedFullAccount('t1', 'user-1');
    seedFullAccount('t1', 'user-2'); // different owner — must not leak into the export

    const section = await capturedExporter.fn?.({
      userId: 'user-1',
      tenantId: 't1',
      options: { includeFiles: true },
    });

    const data = section?.data as {
      profile: { allergies: string } | null;
      measurements: { id: string }[];
      labGroups: { id: string }[];
      labResults: { id: string }[];
      medications: { id: string }[];
      notes: { id: string }[];
    };
    expect(data.profile?.allergies).toBe('Penicillin');
    expect(data.measurements).toHaveLength(1);
    expect(data.labGroups).toHaveLength(1);
    expect(data.labResults).toHaveLength(1);
    expect(data.medications).toHaveLength(1);
    expect(data.notes).toHaveLength(1);
  });

  it('imports every table into the importing account with remapped ids, preserving cross-references', async () => {
    seedFullAccount('t1', 'user-1');
    const section = await capturedExporter.fn?.({
      userId: 'user-1',
      tenantId: 't1',
      options: { includeFiles: true },
    });
    expect(section).toBeDefined();

    const remapId = makeRemapper();
    await capturedImporter.fn?.(section as PluginExportSection, {
      userId: 'user-2',
      tenantId: 't1',
      remapId,
    });

    expect(store.healthlog_profiles).toHaveLength(2); // original + imported
    expect(store.healthlog_measurements).toHaveLength(2);
    expect(store.healthlog_lab_groups).toHaveLength(2);
    expect(store.healthlog_lab_results).toHaveLength(2);
    expect(store.healthlog_medications).toHaveLength(2);
    expect(store.healthlog_notes).toHaveLength(2);

    const importedGroup = store.healthlog_lab_groups.find((r) => r.userId === 'user-2');
    const importedResult = store.healthlog_lab_results.find((r) => r.userId === 'user-2');
    const importedNote = store.healthlog_notes.find((r) => r.userId === 'user-2');
    // The lab result's groupId and the note's linkedId both travel as the
    // *original* id in the export and must resolve to the *same* remapped
    // id as the group itself — not two independently-minted ids.
    expect(importedResult?.groupId).toBe(importedGroup?.id);
    expect(importedNote?.linkedId).toBe(importedGroup?.id);
    expect(importedNote?.linkedType).toBe('lab_group');
  });

  it('does not duplicate the profile singleton on a second import into the same account', async () => {
    seedFullAccount('t1', 'user-1');
    const section = await capturedExporter.fn?.({
      userId: 'user-1',
      tenantId: 't1',
      options: { includeFiles: true },
    });

    // Importing into the SAME account it was exported from (e.g. a restore).
    await capturedImporter.fn?.(section as PluginExportSection, {
      userId: 'user-1',
      tenantId: 't1',
      remapId: makeRemapper(),
    });

    expect(store.healthlog_profiles).toHaveLength(1);
    // Non-singleton tables are still additive.
    expect(store.healthlog_measurements).toHaveLength(2);
  });
});

describe('delete cascade (HL-10/HL-13)', () => {
  it('removes every table for the deleted user only, across tenants and other users', async () => {
    seedFullAccount('t1', 'user-1');
    seedFullAccount('t1', 'user-2');
    seedFullAccount('t2', 'user-1'); // same nominal userId, different tenant

    const result = await capturedDeleter.fn?.({ userId: 'user-1', tenantId: 't1', db: fakeDb });

    expect(result?.deleted).toBe(6); // one row per table for user-1/t1
    expect(store.healthlog_profiles).toHaveLength(2);
    expect(store.healthlog_measurements).toHaveLength(2);
    expect(store.healthlog_lab_groups).toHaveLength(2);
    expect(store.healthlog_lab_results).toHaveLength(2);
    expect(store.healthlog_medications).toHaveLength(2);
    expect(store.healthlog_notes).toHaveLength(2);

    // The surviving rows belong only to user-2/t1 and user-1/t2.
    const remainingOwners = store.healthlog_measurements.map((r) => `${r.tenantId}:${r.userId}`);
    expect(remainingOwners.sort()).toEqual(['t1:user-2', 't2:user-1']);
  });
});
