/**
 * @file nav.ts
 * @description Builds the staff sidebar from the modules an org actually has.
 *
 * Two filters apply, and they mean different things:
 *   - Module disabled: the church has not subscribed. The destination does not
 *     exist for them at all.
 *   - Permission missing: the church has it, this person does not. The
 *     destination exists but is not theirs.
 *
 * Both end in a hidden nav item, which is why they are resolved in one place
 * rather than left to each screen to interpret.
 */
import type { NavSection } from '@/components/layout';
import { SECTION_ORDER } from './registry';
import type { ResolvedModule } from './useModules';

export function buildStaffNav(
  modules: ResolvedModule[],
  can: (permission: string) => boolean,
  base = '/staff',
): NavSection[] {
  const bySection = new Map<string, NavSection['items']>();

  for (const module of modules) {
    if (!module.enabled || !module.nav) continue;

    for (const item of module.nav) {
      if (item.permission && !can(item.permission)) continue;

      const section = item.section ?? module.name;
      bySection.set(section, [
        ...(bySection.get(section) ?? []),
        { label: item.label, href: `${base}/${item.path}`, icon: item.icon },
      ]);
    }
  }

  const ordered = [...bySection.entries()].sort(
    (a, b) => sectionRank(a[0]) - sectionRank(b[0]),
  );

  return ordered
    .filter(([, items]) => items.length > 0)
    .map(([title, items]) => ({ title, items }));
}

function sectionRank(section: string): number {
  const index = SECTION_ORDER.indexOf(section);
  return index === -1 ? SECTION_ORDER.length : index;
}
