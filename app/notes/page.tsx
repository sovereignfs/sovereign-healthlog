import { PageHeader } from '@sovereignfs/ui';
import { BackLink } from '../_components/BackLink';
import { NotesView } from '../_components/NotesView';
import { listNotes } from '../_lib/actions';
import styles from './page.module.css';

export default async function NotesPage() {
  const notes = await listNotes();

  return (
    <div className={styles.page}>
      <BackLink href="/healthlog">Back</BackLink>

      <PageHeader
        title="Notes"
        description="Dated notes about symptoms, appointments, and anything else worth remembering."
      />

      <NotesView notes={notes} />
    </div>
  );
}
