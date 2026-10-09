/**
 * @file leadershipService.ts
 * @description The church's leadership tree. Reading needs team:read;
 * changing it is the leader's alone (leadership:manage).
 */
import type { LeadershipPosition, PositionInput, PositionNode } from '@/types';
import { apiRequest, requireApi } from './adapter';

export const leadershipService = {
  async list(): Promise<LeadershipPosition[]> {
    requireApi('Leadership structure');
    return apiRequest<LeadershipPosition[]>('/leadership/positions');
  },

  async create(input: PositionInput): Promise<LeadershipPosition> {
    requireApi('Leadership structure');
    return apiRequest<LeadershipPosition>('/leadership/positions', { method: 'POST', body: JSON.stringify(input) });
  },

  async update(id: string, input: Partial<PositionInput>): Promise<LeadershipPosition> {
    requireApi('Leadership structure');
    return apiRequest<LeadershipPosition>(`/leadership/positions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },

  async remove(id: string): Promise<void> {
    requireApi('Leadership structure');
    await apiRequest<void>(`/leadership/positions/${id}`, { method: 'DELETE' });
  },

  async assign(positionId: string, membershipId: string): Promise<LeadershipPosition> {
    requireApi('Leadership structure');
    return apiRequest<LeadershipPosition>(`/leadership/positions/${positionId}/holders`, {
      method: 'POST',
      body: JSON.stringify({ membershipId }),
    });
  },

  async unassign(positionId: string, membershipId: string): Promise<void> {
    requireApi('Leadership structure');
    await apiRequest<void>(`/leadership/positions/${positionId}/holders/${membershipId}`, { method: 'DELETE' });
  },
};

/** Flat list → tree, children sorted by sortOrder then title. */
export function buildPositionTree(positions: LeadershipPosition[]): PositionNode[] {
  const nodes = new Map<string, PositionNode>(positions.map((p) => [p.id, { ...p, children: [] }]));
  const roots: PositionNode[] = [];
  for (const node of nodes.values()) {
    const parent = node.parentId ? nodes.get(node.parentId) : undefined;
    (parent ? parent.children : roots).push(node);
  }
  const sort = (list: PositionNode[]) => {
    list.sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title));
    list.forEach((n) => sort(n.children));
  };
  sort(roots);
  return roots;
}
