import { notFound } from 'next/navigation';
import { Card, PageHeader } from '@sovereignfs/ui';
import { BackLink } from '../../_components/BackLink';
import { DeleteLabGroupButton } from '../../_components/DeleteLabGroupButton';
import { EditLabGroupDialog } from '../../_components/LabGroupFormDialog';
import { AddLabResultDialog } from '../../_components/LabResultFormDialog';
import { LabResultsTable } from '../../_components/LabResultsTable';
import { getLabGroup, listLabResults } from '../../_lib/actions';
import { formatLocalDateOnly } from '../../_lib/formUtils';
import styles from './page.module.css';

export default async function LabGroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const group = await getLabGroup(id);
  if (!group) notFound();

  const results = await listLabResults(id);

  const description = [
    formatLocalDateOnly(group.collectedAt),
    group.reportedAt ? `reported ${formatLocalDateOnly(group.reportedAt)}` : null,
    group.provider,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className={styles.page}>
      <BackLink href="/healthlog/labs">Back to labs</BackLink>

      <PageHeader
        title={group.title}
        description={description}
        action={
          <div className={styles.headerActions}>
            <EditLabGroupDialog group={group} />
            <DeleteLabGroupButton id={group.id} title={group.title} />
          </div>
        }
      />

      {group.notes && (
        <Card padding="sm" className={styles.notesCard}>
          {group.notes}
        </Card>
      )}

      <div className={styles.resultsHeader}>
        <h2 className={styles.resultsTitle}>Results</h2>
        <AddLabResultDialog groupId={group.id} />
      </div>

      <LabResultsTable results={results} groupId={group.id} />
    </div>
  );
}
