import { Button, Input, PageHeader } from '@sovereignfs/ui';
import { HealthLogNav } from '../_components/HealthLogNav';
import { SearchResultsView } from '../_components/SearchResultsView';
import { searchHealthLog } from '../_lib/actions';
import styles from './page.module.css';

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? '';
  const results = query ? await searchHealthLog(query) : null;

  return (
    <div className={styles.page}>
      <HealthLogNav active="/healthlog/search" />

      <PageHeader
        title="Search"
        description="Search medications, lab results and providers, notes, and measurement notes."
      />

      {/* Plain GET form — a full page navigation, not a client search box.
          Keeps the query shareable/bookmarkable via ?q= and needs no client
          component for what's otherwise a fully server-rendered page. */}
      <form action="/healthlog/search" method="GET" className={styles.form}>
        <Input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Search HealthLog…"
          aria-label="Search"
          className={styles.input}
        />
        <Button type="submit">Search</Button>
      </form>

      {results && <SearchResultsView query={query} results={results} />}
    </div>
  );
}
