import type { NextRequest } from 'next/server';
import { sdk } from '@sovereignfs/sdk';
import { getVisitSummaryData } from '../../../_lib/actions';
import { buildVisitSummaryMarkdown } from '../../../_lib/visitSummary';

/**
 * Streams the same visit-summary selection (`?labGroupIds=&noteIds=`) as a
 * downloadable Markdown file — the print view's page itself is the PDF path
 * (browser print), this route is the Markdown path (HLG-52). Regenerates
 * the summary server-side from the query params rather than accepting a
 * client-built body, same as `sovereign-tritext`'s own export route.
 */
export async function GET(request: NextRequest): Promise<Response> {
  await sdk.auth.requireSession();

  const labGroupIds = request.nextUrl.searchParams.getAll('labGroupIds');
  const noteIds = request.nextUrl.searchParams.getAll('noteIds');
  const data = await getVisitSummaryData(labGroupIds, noteIds);
  const markdown = buildVisitSummaryMarkdown(data);

  return new Response(markdown, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="visit-summary-${new Date().toISOString().slice(0, 10)}.md"`,
    },
  });
}
