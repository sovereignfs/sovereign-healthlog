export interface LabTestSuggestion {
  name: string;
  unit: string;
}

/**
 * Small local suggestion dictionary — resolved open question 4. Client-side
 * autocomplete only, never required or enforced; free text always remains a
 * valid test name. Nudging toward consistent naming directly improves
 * HLG-24's name-based previous-value matching, without an external
 * terminology API or any PHI leaving the browser.
 */
export const LAB_TEST_SUGGESTIONS: LabTestSuggestion[] = [
  { name: 'Hemoglobin', unit: 'g/dL' },
  { name: 'Hematocrit', unit: '%' },
  { name: 'White Blood Cell Count', unit: '10^3/uL' },
  { name: 'Red Blood Cell Count', unit: '10^6/uL' },
  { name: 'Platelet Count', unit: '10^3/uL' },
  { name: 'MCV', unit: 'fL' },
  { name: 'MCH', unit: 'pg' },
  { name: 'MCHC', unit: 'g/dL' },
  { name: 'Glucose, Fasting', unit: 'mg/dL' },
  { name: 'Sodium', unit: 'mmol/L' },
  { name: 'Potassium', unit: 'mmol/L' },
  { name: 'Chloride', unit: 'mmol/L' },
  { name: 'Bicarbonate', unit: 'mmol/L' },
  { name: 'BUN', unit: 'mg/dL' },
  { name: 'Creatinine', unit: 'mg/dL' },
  { name: 'eGFR', unit: 'mL/min/1.73m²' },
  { name: 'Calcium', unit: 'mg/dL' },
  { name: 'Total Cholesterol', unit: 'mg/dL' },
  { name: 'LDL Cholesterol', unit: 'mg/dL' },
  { name: 'HDL Cholesterol', unit: 'mg/dL' },
  { name: 'Triglycerides', unit: 'mg/dL' },
  { name: 'ALT', unit: 'U/L' },
  { name: 'AST', unit: 'U/L' },
  { name: 'ALP', unit: 'U/L' },
  { name: 'Bilirubin, Total', unit: 'mg/dL' },
  { name: 'Albumin', unit: 'g/dL' },
  { name: 'TSH', unit: 'mIU/L' },
  { name: 'Free T4', unit: 'ng/dL' },
  { name: 'Free T3', unit: 'pg/mL' },
  { name: 'HbA1c', unit: '%' },
  { name: 'Insulin, Fasting', unit: 'uIU/mL' },
  { name: 'Vitamin D, 25-OH', unit: 'ng/mL' },
  { name: 'Vitamin B12', unit: 'pg/mL' },
  { name: 'Folate', unit: 'ng/mL' },
  { name: 'Ferritin', unit: 'ng/mL' },
  { name: 'Iron', unit: 'ug/dL' },
  { name: 'Magnesium', unit: 'mg/dL' },
  { name: 'hs-CRP', unit: 'mg/L' },
  { name: 'ESR', unit: 'mm/hr' },
  { name: 'Testosterone, Total', unit: 'ng/dL' },
  { name: 'Cortisol', unit: 'ug/dL' },
  { name: 'PSA', unit: 'ng/mL' },
  { name: 'Uric Acid', unit: 'mg/dL' },
];

/** Lowercase-normalized key matching `healthlog_lab_results.normalized_test_name`. */
export function normalizeTestName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function filterLabTestSuggestions(query: string, limit = 8): LabTestSuggestion[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return LAB_TEST_SUGGESTIONS.filter((suggestion) => suggestion.name.toLowerCase().includes(q)).slice(
    0,
    limit,
  );
}
