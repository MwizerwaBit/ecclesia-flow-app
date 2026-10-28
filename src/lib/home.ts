/**
 * @file home.ts
 * @description Where "home" is: the signed-in person's dashboard, or the
 * landing page when nobody is signed in. One answer, used by every header and
 * error screen, so a lost visitor always has a way back.
 */
import { ROLES } from '@/lib/constants';

const DASHBOARD_BY_ROLE: Record<string, string> = {
  [ROLES.MEMBER]: '/portal',
  [ROLES.STAFF]: '/staff/dashboard',
  [ROLES.BOARD]: '/board/dashboard',
  [ROLES.PLATFORM_ADMIN]: '/platform/dashboard',
};

export const LANDING_PATH = '/';

export function homePath(role: string | null | undefined): string {
  return (role && DASHBOARD_BY_ROLE[role]) || LANDING_PATH;
}
