/**
 * v0.1 preferred-unit display helpers only — not full conversion (resolved
 * open question 2). Each measurement is stored with the unit the user
 * entered it in (`healthlog_measurements.unit`); `preferredUnits` only picks
 * the default unit offered on a new entry.
 *
 * Blood pressure (always mmHg) and heart rate (always bpm) have no unit
 * choice, so they're not part of this preference set.
 */
export interface PreferredUnits {
  height: 'cm' | 'in';
  weight: 'kg' | 'lb';
  temperature: 'c' | 'f';
  glucose: 'mgdl' | 'mmoll';
}

export const DEFAULT_PREFERRED_UNITS: PreferredUnits = {
  height: 'cm',
  weight: 'kg',
  temperature: 'c',
  glucose: 'mgdl',
};

export function parsePreferredUnits(raw: string | null | undefined): PreferredUnits {
  if (!raw) return DEFAULT_PREFERRED_UNITS;
  try {
    const parsed = JSON.parse(raw) as Partial<PreferredUnits>;
    return { ...DEFAULT_PREFERRED_UNITS, ...parsed };
  } catch {
    return DEFAULT_PREFERRED_UNITS;
  }
}

export function serializePreferredUnits(units: PreferredUnits): string {
  return JSON.stringify(units);
}

/**
 * Default unit offered when starting a new entry for a given measurement
 * type — blood pressure and heart rate have a fixed unit (no preference),
 * the rest come from `preferredUnits`, and an unrecognized (custom) type has
 * no default at all since the user names it (and its unit) themselves.
 */
export function defaultUnitForType(type: string, preferredUnits: PreferredUnits): string {
  switch (type) {
    case 'height':
      return preferredUnits.height;
    case 'weight':
      return preferredUnits.weight;
    case 'temperature':
      return preferredUnits.temperature;
    case 'glucose':
      return preferredUnits.glucose;
    case 'blood_pressure':
      return 'mmHg';
    case 'heart_rate':
      return 'bpm';
    default:
      return '';
  }
}
