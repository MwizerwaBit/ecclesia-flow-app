/**
 * @file HouseholdView.tsx
 * @description A family as one unit — shared address, combined giving, everyone in it.
 *
 * Households exist because pastoral care and giving both run along family lines:
 * a single envelope often covers a whole house, and a visit is to a home rather
 * than to an individual record. Only reachable today from a member profile that
 * has a `householdId` on file — most people don't yet, which is a real empty
 * state rather than a missing feature.
 */
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { Home, Users } from 'lucide-react';
import { membersService } from '@/services/membersService';
import { Avatar, Badge, Button, Card, ContactActions, EmptyState, Skeleton, StatTile, Text } from '@/components/ui';
import { formatCurrency } from '@/lib/formatters';

export function HouseholdView() {
  const { id = '' } = useParams();

  const { data: household, isLoading } = useQuery({
    queryKey: ['household', id],
    queryFn: () => membersService.getHousehold(id),
    enabled: Boolean(id),
  });

  if (isLoading) {
    return (
      <div className="w-full max-w-2xl mx-auto px-4 py-6 animate-fade-in space-y-6">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-16 rounded-xl" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  if (!household) {
    return (
      <div className="w-full max-w-2xl mx-auto px-4 py-6 animate-fade-in">
        <Text variant="h1" className="mb-1">
          Household
        </Text>
        <EmptyState
          icon={Home}
          title="No household on file"
          description="This person isn't linked to a household record yet."
          action={
            <Link to="/staff/members">
              <Button variant="secondary">Back to directory</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const head = household.members.find((m) => m.id === household.headMemberId) ?? household.members[0];

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 animate-fade-in space-y-6">
      <header>
        <div className="flex items-center gap-2 mb-1">
          <Home size={20} className="text-primary shrink-0" aria-hidden />
          <Text variant="h1" className="min-w-0">
            {household.name}
          </Text>
        </div>
        <Text variant="body" color="muted">
          {household.members.length} people at one address
        </Text>
      </header>

      {household.address && (
        <Card variant="outline" padding="md">
          <div className="flex items-start gap-3">
            <Home size={18} className="text-slate-400 shrink-0 mt-0.5" aria-hidden />
            <div>
              <Text variant="body">{household.address.line1}</Text>
              <Text variant="body-sm" color="muted">
                {household.address.city}
                {household.address.state ? `, ${household.address.state}` : ''} {household.address.postalCode}
              </Text>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        <StatTile label="In household" value={String(household.members.length)} icon={Users} />
        <StatTile
          label="Combined giving"
          value={formatCurrency(household.totalGiving ?? 0)}
          hint="This year, all members"
        />
      </div>

      {/* Members */}
      <div>
        <Text variant="h2" className="mb-3">
          Members
        </Text>
        <Card padding="none" className="divide-y divide-slate-100 dark:divide-slate-800">
          {household.members.map((member) => (
            <div key={member.id} className="px-4 py-3">
              <div className="flex items-center gap-3">
                <Avatar
                  src={member.photoUrl}
                  name={`${member.firstName} ${member.lastName}`}
                  size="md"
                  className="shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <Link to={`/staff/members/${member.id}`}>
                    <p className="font-member-name text-h3 truncate text-slate-900 dark:text-slate-100 hover:text-primary transition-colors">
                      {member.firstName} {member.lastName}
                    </p>
                  </Link>
                  <Text variant="caption" color="muted">
                    {member.id === head?.id ? 'Head of household' : 'Member'}
                    {member.envelopeNumber ? ` · #${member.envelopeNumber}` : ''}
                  </Text>
                </div>
                <Badge
                  variant={member.status === 'active' ? 'success' : 'neutral'}
                  size="sm"
                  className="shrink-0"
                >
                  {member.status}
                </Badge>
              </div>
            </div>
          ))}
        </Card>
      </div>

      {/* One address, one number — the household's own contact details. */}
      <ContactActions
        name={`the ${head.lastName} household`}
        phone={head.phone}
        email={head.email}
        variant="secondary"
      />
    </div>
  );
}
