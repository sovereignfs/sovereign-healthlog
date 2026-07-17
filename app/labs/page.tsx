import Link from 'next/link';
import { Card, EmptyState, PageHeader } from '@sovereignfs/ui';
import { BackLink } from '../_components/BackLink';
import { AddLabGroupDialog } from '../_components/LabGroupFormDialog';
import { listLabGroups } from '../_lib/actions';
import { formatLocalDateOnly } from '../_lib/formUtils';
import styles from './page.module.css';

export default async function LabsPage() {
  const groups = await listLabGroups();

  return (
    <div className={styles.page}>
      <BackLink href="/healthlog">Back</BackLink>

      <PageHeader
        title="Labs"
        description="Lab reports and their individual test results."
        action={<AddLabGroupDialog />}
      />

      {groups.length === 0 ? (
        <EmptyState
          icon="activity"
          heading="No lab groups yet"
          description="Add your first lab report to start recording results."
        />
      ) : (
        <div className={styles.groupList}>
          {groups.map((group) => (
            <Link key={group.id} href={`/healthlog/labs/${group.id}`} className={styles.groupLink}>
              <Card interactive className={styles.groupCard}>
                <div className={styles.groupHeader}>
                  <h2 className={styles.groupTitle}>{group.title}</h2>
                  <span className={styles.groupDate}>{formatLocalDateOnly(group.collectedAt)}</span>
                </div>
                <div className={styles.groupMeta}>
                  {group.provider && <span>{group.provider}</span>}
                  <span>
                    {group.resultCount} {group.resultCount === 1 ? 'result' : 'results'}
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
