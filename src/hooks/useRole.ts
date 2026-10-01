/**
 * @file useRole.ts
 * @description Role-based access control hook.
 *
 * Usage:
 *   const { can, role, isStaff } = useRole();
 *   if (can('finance:read')) { ... }
 */
import { useCurrentRole } from './useAuthStore';
import { ROLES, type Role } from '@/lib/constants';

// Permission map — what each role can do
// Format: "resource:action" strings
const ROLE_PERMISSIONS: Record<Role, string[]> = {
  [ROLES.MEMBER]: [
    'portal:view',
    'profile:read',
    'profile:update_own',
    'events:read',
    'announcements:read',
    'giving:read_own',
    'notifications:read',
  ],
  [ROLES.STAFF]: [
    'portal:view',
    'members:read',
    'members:create',
    'members:update',
    'attendance:read',
    'attendance:create',
    'events:read',
    'events:create',
    'events:update',
    'finance:read',
    'finance:create',
    'finance:update',
    'announcements:read',
    'announcements:create',
    'certificates:read',
    'certificates:create',
    'dashboard:view',
    'profile:read',
    'profile:update_own',
  ],
  [ROLES.BOARD]: [
    // All staff permissions +
    'members:read',
    'members:create',
    'members:update',
    'members:export',
    'attendance:read',
    'attendance:create',
    'events:read',
    'events:create',
    'events:update',
    'finance:read',
    'finance:create',
    'finance:update',
    'finance:export',
    'announcements:read',
    'announcements:create',
    'certificates:read',
    'certificates:create',
    'dashboard:view',
    'hierarchy:read',
    'hierarchy:update',
    'team:read',
    'team:invite',
    'roles:read',
    'roles:create',
    'analytics:read',
    'org:read',
    'org:settings',
    'profile:read',
    'profile:update_own',
    'pastoral_notes:read',
    'pastoral_notes:write',
    // Board-specific
    'network:read',
    'parish_comparison:read',
    'domain:manage',
    'white_label:manage',
  ],
  [ROLES.PLATFORM_ADMIN]: [
    // All permissions
    '*',
  ],
};

interface UseRoleReturn {
  role: Role | null;
  can: (permission: string) => boolean;
  isMember: boolean;
  isStaff: boolean;
  isBoard: boolean;
  isPlatformAdmin: boolean;
  isAuthenticated: boolean;
}

export function useRole(): UseRoleReturn {
  const role = useCurrentRole();

  const can = (permission: string): boolean => {
    if (!role) return false;
    const permissions = ROLE_PERMISSIONS[role] ?? [];
    // Platform admin has wildcard
    if (permissions.includes('*')) return true;
    return permissions.includes(permission);
  };

  return {
    role,
    can,
    isMember: role === ROLES.MEMBER,
    isStaff: role === ROLES.STAFF,
    isBoard: role === ROLES.BOARD,
    isPlatformAdmin: role === ROLES.PLATFORM_ADMIN,
    isAuthenticated: role !== null,
  };
}
