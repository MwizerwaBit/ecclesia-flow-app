/**
 * @file leadership.types.ts
 * @description The church's own leadership tree — named positions that may
 * grant a role and a branch scope to whoever holds them.
 */

export interface PositionHolder {
  membershipId: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  photoUrl: string | null;
  assignedAt: string;
}

export interface LeadershipPosition {
  id: string;
  parentId: string | null;
  title: string;
  description: string | null;
  /** The RBAC role holders receive; null = honorific (no extra access). */
  roleId: string | null;
  roleName: string | null;
  /** The branch holders are scoped to; null = whole church. */
  unitId: string | null;
  unitName: string | null;
  sortOrder: number;
  holders: PositionHolder[];
}

export interface PositionInput {
  title: string;
  parentId?: string | null;
  description?: string | null;
  roleId?: string | null;
  unitId?: string | null;
  sortOrder?: number;
}

/** A position with its children, for rendering the tree. */
export interface PositionNode extends LeadershipPosition {
  children: PositionNode[];
}
