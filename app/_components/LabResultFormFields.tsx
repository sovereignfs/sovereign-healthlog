'use client';

import { useEffect, useState } from 'react';
import { Checkbox, FormField, Input, Select, SuggestionInput, Textarea } from '@sovereignfs/ui';
import type { LabResultEntry, PreviousLabResult } from '../_lib/actions';
import { getPreviousLabResults } from '../_lib/actions';
import type { LabFlag, LabValueKind } from '../_lib/labFormat';
import { LAB_FLAG_LABELS, LAB_VALUE_KIND_LABELS, LAB_VALUE_KINDS } from '../_lib/labFormat';
import { filterLabTestSuggestions, normalizeTestName } from '../_lib/labMatching';
import styles from './LabResultFormFields.module.css';

/** HLG-24's name-based previous-value lookup, debounced client-side so it
 * doesn't fire a server action on every keystroke. */
function usePreviousLabResults(testName: string, excludeResultId: string | undefined) {
  const [previous, setPrevious] = useState<PreviousLabResult[]>([]);

  useEffect(() => {
    const normalized = normalizeTestName(testName);
    if (!normalized) {
      setPrevious([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      void getPreviousLabResults(normalized, excludeResultId).then((results) => {
        if (!cancelled) setPrevious(results);
      });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [testName, excludeResultId]);

  return previous;
}

export function LabResultFormFields({ entry }: { entry?: LabResultEntry }) {
  const [testName, setTestName] = useState(entry?.testName ?? '');
  const [valueKind, setValueKind] = useState<LabValueKind>(entry?.valueKind ?? 'numeric');
  const [tracked, setTracked] = useState(entry?.tracked ?? false);
  const previous = usePreviousLabResults(testName, entry?.id);

  const suggestions = filterLabTestSuggestions(testName).map((s) => ({
    id: s.name,
    label: s.name,
    meta: s.unit,
  }));

  return (
    <>
      <FormField label="Test name">
        {(field) => (
          <>
            <SuggestionInput
              id={field.id}
              aria-label="Test name"
              value={testName}
              onChange={setTestName}
              options={suggestions}
              onSelect={(option) => setTestName(option.label)}
              placeholder="e.g. LDL Cholesterol"
            />
            <input type="hidden" name="testName" value={testName} />
          </>
        )}
      </FormField>

      {previous.length > 0 && (
        <div className={styles.previousHint}>
          <span className={styles.previousLabel}>Previous:</span>
          <ul className={styles.previousList}>
            {previous.map((p) => (
              <li key={p.id}>
                {p.displayValue} · {p.collectedAt}
              </li>
            ))}
          </ul>
        </div>
      )}

      <FormField label="Value type">
        {(field) => (
          <Select
            {...field}
            name="valueKind"
            value={valueKind}
            onChange={(e) => setValueKind(e.target.value as LabValueKind)}
          >
            {LAB_VALUE_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {LAB_VALUE_KIND_LABELS[kind]}
              </option>
            ))}
          </Select>
        )}
      </FormField>

      {valueKind === 'numeric' && (
        <div className={styles.row}>
          <FormField label="Value">
            {(field) => (
              <Input
                {...field}
                name="numericValue"
                type="number"
                step="any"
                defaultValue={entry?.valueKind === 'numeric' ? (entry?.numericValue ?? '') : ''}
                required
              />
            )}
          </FormField>
          <FormField label="Unit">
            {(field) => (
              <Input {...field} name="unit" defaultValue={entry?.valueKind === 'numeric' ? (entry?.unit ?? '') : ''} />
            )}
          </FormField>
        </div>
      )}

      {valueKind === 'text' && (
        <FormField label="Value">
          {(field) => (
            <Input
              {...field}
              name="textValue"
              defaultValue={entry?.valueKind === 'text' ? (entry?.textValue ?? '') : ''}
              required
            />
          )}
        </FormField>
      )}

      {valueKind === 'positive_negative' && (
        <FormField label="Result">
          {(field) => (
            <Select
              {...field}
              name="positiveNegativeValue"
              defaultValue={entry?.valueKind === 'positive_negative' ? (entry?.textValue ?? '') : ''}
            >
              <option value="">Choose…</option>
              <option value="positive">Positive</option>
              <option value="negative">Negative</option>
            </Select>
          )}
        </FormField>
      )}

      {valueKind === 'detected_not_detected' && (
        <FormField label="Result">
          {(field) => (
            <Select
              {...field}
              name="detectedValue"
              defaultValue={entry?.valueKind === 'detected_not_detected' ? (entry?.textValue ?? '') : ''}
            >
              <option value="">Choose…</option>
              <option value="detected">Detected</option>
              <option value="not_detected">Not detected</option>
            </Select>
          )}
        </FormField>
      )}

      {valueKind === 'numeric' && (
        <div className={styles.row}>
          <FormField label="Reference low" hint="Optional.">
            {(field) => (
              <Input {...field} name="referenceLow" type="number" step="any" defaultValue={entry?.referenceLow ?? ''} />
            )}
          </FormField>
          <FormField label="Reference high" hint="Optional.">
            {(field) => (
              <Input
                {...field}
                name="referenceHigh"
                type="number"
                step="any"
                defaultValue={entry?.referenceHigh ?? ''}
              />
            )}
          </FormField>
        </div>
      )}

      <FormField label="Reference range (text)" hint='Optional — e.g. "< 5.7".'>
        {(field) => <Input {...field} name="referenceText" defaultValue={entry?.referenceText ?? ''} />}
      </FormField>

      <FormField label="Flag" hint="Optional.">
        {(field) => (
          <Select {...field} name="flag" defaultValue={entry?.flag ?? ''}>
            <option value="">None</option>
            {(Object.keys(LAB_FLAG_LABELS) as LabFlag[]).map((flag) => (
              <option key={flag} value={flag}>
                {LAB_FLAG_LABELS[flag]}
              </option>
            ))}
          </Select>
        )}
      </FormField>

      <Checkbox
        checked={tracked}
        onChange={setTracked}
        label="Track this result on the dashboard"
      />
      <input type="hidden" name="tracked" value={tracked ? 'true' : 'false'} />

      <FormField label="Note">
        {(field) => <Textarea {...field} name="note" rows={2} defaultValue={entry?.note ?? ''} />}
      </FormField>
    </>
  );
}
