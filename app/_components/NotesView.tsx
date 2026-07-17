import { Badge, Card, EmptyState } from '@sovereignfs/ui';
import type { NoteEntry } from '../_lib/actions';
import { NOTE_CATEGORY_LABELS, NOTE_LINK_TYPE_LABELS } from '../_lib/notes';
import { AddNoteDialog, EditNoteDialog } from './NoteFormDialog';
import { DeleteNoteButton } from './DeleteNoteButton';
import styles from './NotesView.module.css';

function formatDateTime(epochSeconds: number): string {
  return new Date(epochSeconds * 1000).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function NotesView({ notes }: { notes: NoteEntry[] }) {
  return (
    <div className={styles.view}>
      <div className={styles.toolbar}>
        <AddNoteDialog />
      </div>

      {notes.length === 0 ? (
        <EmptyState
          icon="pencil"
          heading="No notes yet"
          description="Add a dated note about a symptom, appointment, or anything else worth remembering."
        />
      ) : (
        <div className={styles.list}>
          {notes.map((note) => (
            <Card key={note.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.titleRow}>
                  <h2 className={styles.title}>{note.title}</h2>
                  <Badge>{NOTE_CATEGORY_LABELS[note.category]}</Badge>
                </div>
                <div className={styles.cardActions}>
                  <EditNoteDialog entry={note} />
                  <DeleteNoteButton id={note.id} title={note.title} />
                </div>
              </div>
              <span className={styles.date}>{formatDateTime(note.notedAt)}</span>
              <p className={styles.body}>{note.body}</p>
              {note.linkedLabel && note.linkedType && (
                <span className={styles.linkChip}>
                  {NOTE_LINK_TYPE_LABELS[note.linkedType]}: {note.linkedLabel}
                </span>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
