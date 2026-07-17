import { EmptyState } from '@sovereignfs/ui';
import type { LabResultEntry } from '../_lib/actions';
import { LAB_FLAG_LABELS, formatLabResultValue } from '../_lib/labFormat';
import { DeleteLabResultButton } from './DeleteLabResultButton';
import { EditLabResultDialog } from './LabResultFormDialog';
import { ToggleLabResultTrackedButton } from './ToggleLabResultTrackedButton';
import styles from './LabResultsTable.module.css';

function formatReferenceRange(result: LabResultEntry): string {
  if (result.referenceLow != null && result.referenceHigh != null) {
    return `${result.referenceLow}–${result.referenceHigh}`;
  }
  if (result.referenceLow != null) return `> ${result.referenceLow}`;
  if (result.referenceHigh != null) return `< ${result.referenceHigh}`;
  if (result.referenceText) return result.referenceText;
  return '—';
}

export function LabResultsTable({
  results,
  groupId,
}: {
  results: LabResultEntry[];
  groupId: string;
}) {
  if (results.length === 0) {
    return (
      <EmptyState
        icon="activity"
        heading="No results yet"
        description="Add the first result from this lab report."
      />
    );
  }

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Test</th>
            <th>Value</th>
            <th>Reference range</th>
            <th>Flag</th>
            <th>Note</th>
            <th className={styles.actionsHeader}>
              <span className={styles.srOnly}>Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {results.map((result) => (
            <tr key={result.id}>
              <td>{result.testName}</td>
              <td>{formatLabResultValue(result)}</td>
              <td>{formatReferenceRange(result)}</td>
              <td>{result.flag ? LAB_FLAG_LABELS[result.flag] : '—'}</td>
              <td>{result.note ?? '—'}</td>
              <td className={styles.rowActions}>
                <ToggleLabResultTrackedButton
                  id={result.id}
                  groupId={groupId}
                  tracked={result.tracked}
                />
                <EditLabResultDialog entry={result} />
                <DeleteLabResultButton id={result.id} groupId={groupId} testName={result.testName} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
