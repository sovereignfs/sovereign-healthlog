import { NavTabs } from '@sovereignfs/ui';
import type { NavTabItem } from '@sovereignfs/ui';

const NAV_ITEMS: { label: string; href: string }[] = [
  { label: 'Dashboard', href: '/healthlog' },
  { label: 'Profile', href: '/healthlog/profile' },
  { label: 'Measurements', href: '/healthlog/measurements' },
  { label: 'Labs', href: '/healthlog/labs' },
  { label: 'Medications', href: '/healthlog/medications' },
  { label: 'Notes', href: '/healthlog/notes' },
  { label: 'Search', href: '/healthlog/search' },
];

/** Persistent plugin-wide nav — SPEC's own "Primary navigation" list. Added
 * in HL-08: once Home became a real dashboard instead of a link list, the
 * other pages needed some other way back to it and to each other. */
export function HealthLogNav({ active }: { active: string }) {
  const items: NavTabItem[] = NAV_ITEMS.map((item) => ({ ...item, active: item.href === active }));
  return <NavTabs items={items} aria-label="HealthLog navigation" />;
}
