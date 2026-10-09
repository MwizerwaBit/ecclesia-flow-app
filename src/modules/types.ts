/**
 * @file types.ts
 * @description The contract a module satisfies.
 *
 * A module is one coherent capability a church can subscribe to — Giving,
 * Certificates, Analytics. It owns its routes, its navigation and the rules for
 * when it is available, so turning it on or off is a data change rather than an
 * edit scattered across the router, the sidebar and every screen that links to it.
 *
 * See `registry.ts` for how to add one.
 */
import type { LucideIcon } from 'lucide-react';
import type { OrgTier } from '@/types';

/** Stable identifiers. These are persisted per organisation, so never rename one. */
export type ModuleId =
  | 'people'
  | 'attendance'
  | 'gatherings'
  | 'giving'
  | 'communications'
  | 'certificates'
  | 'hierarchy'
  | 'analytics'
  | 'media'
  | 'administration';

/** Lowest to highest. A module is included when the org's tier reaches its minTier. */
export const TIER_ORDER: OrgTier[] = ['free', 'seed', 'parish', 'growth', 'diocese', 'enterprise'];

export function tierAtLeast(orgTier: OrgTier, required: OrgTier): boolean {
  return TIER_ORDER.indexOf(orgTier) >= TIER_ORDER.indexOf(required);
}

export interface ModuleNavItem {
  label: string;
  /** Path relative to the surface root, e.g. 'members' under /staff. */
  path: string;
  icon: LucideIcon;
  /** Hidden unless the session's role grants this. */
  permission?: string;
  /** Group heading in the sidebar. Items sharing a section are listed together. */
  section?: string;
}

export interface ModuleRoute {
  /** Path relative to the surface root. */
  path: string;
  /** Lazy import returning the screen component by name. */
  load: () => Promise<Record<string, unknown>>;
  /** Exported component name within that module file. */
  component: string;
  /** Route-level permission. Without it the user gets the 403 screen. */
  permission?: string;
  /** Marks the route the nav points at, for redirecting when disabled. */
  index?: boolean;
}

export interface AppModule {
  id: ModuleId;
  name: string;
  /** One line, shown wherever a church or admin chooses modules. */
  description: string;
  icon: LucideIcon;

  /**
   * Core modules are the product. A church cannot run without knowing who its
   * members are, so these can never be switched off — the toggle is not offered
   * and a platform admin cannot disable them either.
   */
  core?: boolean;

  /** Tier at which this is included. Ignored for core modules. */
  minTier: OrgTier;

  /** Everything this module contributes to the staff surface. */
  nav?: ModuleNavItem[];
  routes: ModuleRoute[];
}

/** What an organisation has turned on, resolved from tier plus any overrides. */
export interface ModuleSubscription {
  tier: OrgTier;
  /**
   * Per-module overrides set by a platform admin — the mechanism behind
   * "give a Diocese feature to a Parish church as part of a negotiation", and
   * equally "switch this off for a church misusing it".
   */
  overrides: Partial<Record<ModuleId, boolean>>;
}
