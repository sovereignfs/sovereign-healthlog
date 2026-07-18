import type { ReactNode } from 'react';
import { registerPortabilityHandlers } from './_lib/portability';

/**
 * In-process and reset on restart — the platform SDK requires
 * re-registering from a request-scoped plugin route, so this runs on every
 * request to any HealthLog page (mirrors sovereign-tasks'/
 * sovereign-plainwrite's own layout.tsx). Best-effort: a registration
 * failure must not block the plugin's own UI. No wrapper markup — every
 * page already renders its own full-page layout (nav, max-width, padding).
 */
export default async function HealthLogLayout({ children }: { children: ReactNode }) {
  try {
    await registerPortabilityHandlers();
  } catch {
    // Portability is a best-effort platform integration.
  }

  return children;
}
