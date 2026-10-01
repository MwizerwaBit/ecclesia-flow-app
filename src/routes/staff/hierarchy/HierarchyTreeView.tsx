/**
 * @file HierarchyTreeView.tsx
 * @description The church's structure as a collapsible tree.
 *
 * The closure-table model in plan.md allows arbitrary depth, so this renders
 * recursively rather than assuming two or three levels. Denominational
 * neutrality matters here: nothing is labelled "Parish" or "Diocese" — each unit
 * carries whatever type name the tenant configured.
 */
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, Navigate } from 'react-router-dom';
import { ChevronDown, ChevronRight, Network, Plus, Users } from 'lucide-react';
import type { HierarchyUnit } from '@/types';
import { commsService } from '@/services/commsService';
import { useRole } from '@/hooks/useRole';
import { AddEditUnitSheet } from './AddEditUnitSheet';
import { Badge, Button, Card, EmptyState, Fab, Text } from '@/components/ui';
import { cn } from '@/lib/cn';

interface TreeNode extends HierarchyUnit {
  children: TreeNode[];
}

/** Builds the nested tree the view renders from the flat list the API returns. */
function buildTree(units: HierarchyUnit[]): TreeNode[] {
  const byId = new Map<string, TreeNode>(units.map((u) => [u.id, { ...u, children: [] }]));
  const roots: TreeNode[] = [];

  byId.forEach((node) => {
    const parent = node.parentId ? byId.get(node.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  });

  return roots;
}

interface UnitRowProps {
  node: TreeNode;
  depth: number;
  collapsedIds: Set<string>;
  onToggle: (id: string) => void;
  onAddChild: (parent: TreeNode) => void;
}

function UnitRow({ node, depth, collapsedIds, onToggle, onAddChild }: UnitRowProps) {
  const hasChildren = node.children.length > 0;
  const isCollapsed = collapsedIds.has(node.id);

  return (
    <div>
      <div
        className="flex items-center gap-2 py-2.5 pr-2 border-b border-slate-100 dark:border-slate-800"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => onToggle(node.id)}
            aria-label={isCollapsed ? `Expand ${node.name}` : `Collapse ${node.name}`}
            aria-expanded={!isCollapsed}
            className="shrink-0 p-1 -ml-1 rounded text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
          </button>
        ) : (
          <span className="size-6 shrink-0" />
        )}

        <Link to={`/staff/hierarchy/units/${node.id}`} className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Text variant="body" className="truncate font-medium">
              {node.name}
            </Text>
            <Badge variant="neutral" size="sm" className="shrink-0">
              {node.type}
            </Badge>
          </div>
          <Text variant="caption" color="muted" className="flex items-center gap-1">
            <Users size={11} aria-hidden />
            {node.memberCount}
            {hasChildren ? ` · ${node.children.length} below` : ''}
          </Text>
        </Link>

        <button
          type="button"
          onClick={() => onAddChild(node)}
          aria-label={`Add a unit under ${node.name}`}
          className="shrink-0 p-2 rounded-full text-slate-400 hover:bg-primary/10 hover:text-primary transition-colors"
        >
          <Plus size={16} />
        </button>
      </div>

      {hasChildren && !isCollapsed && (
        <div className={cn(depth === 0 && 'bg-slate-50/50 dark:bg-slate-800/20')}>
          {node.children.map((child) => (
            <UnitRow
              key={child.id}
              node={child}
              depth={depth + 1}
              collapsedIds={collapsedIds}
              onToggle={onToggle}
              onAddChild={onAddChild}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function HierarchyTreeView() {
  const { can } = useRole();
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [sheetParent, setSheetParent] = useState<HierarchyUnit | null | undefined>(undefined);

  const { data: units = [], isLoading } = useQuery({
    queryKey: ['units'],
    queryFn: () => commsService.listUnits(),
  });

  const tree = useMemo(() => buildTree(units), [units]);
  const deepest = units.reduce((max, u) => Math.max(max, u.depth), 0);

  if (!can('hierarchy:read')) {
    return <Navigate to="/403" replace />;
  }

  function toggle(id: string) {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 animate-fade-in">
      <header className="mb-5">
        <Text variant="h1" className="mb-1">
          Structure
        </Text>
        <Text variant="body" color="muted">
          {units.length} units, {deepest + 1} level{deepest === 0 ? '' : 's'} deep.
        </Text>
      </header>

      {isLoading && (
        <Text variant="body" color="muted" className="text-center py-10">
          Loading structure…
        </Text>
      )}

      {!isLoading && tree.length === 0 && (
        <EmptyState
          icon={Network}
          title="No structure yet"
          description="Units let you group members and report by branch, zone or ministry."
          action={
            <Button variant="primary" leftIcon={Plus} onClick={() => setSheetParent(null)}>
              Add the first unit
            </Button>
          }
        />
      )}

      {tree.length > 0 && (
        <Card padding="none" className="overflow-hidden">
          {tree.map((node) => (
            <UnitRow
              key={node.id}
              node={node}
              depth={0}
              collapsedIds={collapsedIds}
              onToggle={toggle}
              onAddChild={setSheetParent}
            />
          ))}
        </Card>
      )}

      <Fab icon={Plus} label="Add unit" onClick={() => setSheetParent(null)} />

      {sheetParent !== undefined && (
        <AddEditUnitSheet
          parent={sheetParent}
          units={units}
          onClose={() => setSheetParent(undefined)}
        />
      )}
    </div>
  );
}
