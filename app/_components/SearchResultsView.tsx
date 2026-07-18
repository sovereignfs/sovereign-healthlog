import Link from 'next/link';
import { EmptyState } from '@sovereignfs/ui';
import type { SearchResultItem, SearchResults } from '../_lib/actions';
import styles from './SearchResultsView.module.css';

function ResultSection({ title, items }: { title: string; items: SearchResultItem[] }) {
  if (items.length === 0) return null;
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>
        {title} ({items.length})
      </h2>
      <ul className={styles.list}>
        {items.map((item) => (
          <li key={item.id} className={styles.listRow}>
            <Link href={item.href} className={styles.listPrimary}>
              {item.label}
            </Link>
            {item.meta && <span className={styles.listMeta}>{item.meta}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function SearchResultsView({ query, results }: { query: string; results: SearchResults }) {
  const totalCount =
    results.medications.length + results.labs.length + results.notes.length + results.measurements.length;

  if (totalCount === 0) {
    return (
      <EmptyState
        icon="search"
        heading={`No results for "${query}"`}
        description="Try a different medication name, lab test, provider, or note text."
      />
    );
  }

  return (
    <div className={styles.results}>
      <ResultSection title="Medications" items={results.medications} />
      <ResultSection title="Labs" items={results.labs} />
      <ResultSection title="Notes" items={results.notes} />
      <ResultSection title="Measurement notes" items={results.measurements} />
    </div>
  );
}
