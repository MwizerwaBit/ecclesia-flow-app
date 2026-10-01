/**
 * @file HouseholdView.tsx
 * @description A family as one unit — shared address, combined giving, everyone in it.
 *
 * Households exist because pastoral care and giving both run along family lines:
 * a single envelope often covers a whole house, and a visit is to a home rather
 * than to an individual record.
 */
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { Home, Mail, MapPin, Phone, Users } from 'lucide-react';
import { membersService } from '@/services/membersService';
import { Avatar, Badge, Button, Card, StatTile, Text } from '@/components/ui';
import { formatCurrency } from '@/lib/formatters';

export function HouseholdView() {
  const { id = '' } = useParams();

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['members', 'roster'],
    queryFn: () => membersService.list(),
  });

  const { data: detail } = useQuery({
    queryKey: ['member', 'detail'],
    queryFn: () => membersService.getById('m1'),
  });

  // Stands in for a household endpoint: the first few members share an address.
  const household = members.slice(0, 4);
  const [head] = household;

  if (isLoading || !head) {
    return (
      <Text variant="body" color="muted" className="text-center py-16">
        Loading household…
      </Text>
    );
  }

  const address = detail?.address;
  const combinedGiving = (detail?.givingThisYear ?? 0) * 1.6;

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 animate-fade-in space-y-6">
      <header>
        <div className="flex items-center gap-2 mb-1">
          <Home size={20} className="text-primary shrink-0" aria-hidden />
          <Text variant="h1" className="min-w-0">
            The {head.lastName} household
          </Text>
        </div>
        <Text variant="body" color="muted">
          {household.length} people at one address · ID {id || 'hh-1'}
        </Text>
      </header>

      {address && (
        <Card variant="outline" padding="md">
          <div className="flex items-start gap-3">
            <MapPin size={18} className="text-slate-400 shrink-0 mt-0.5" aria-hidden />
            <div>
              <Text variant="body">{address.line1}</Text>
              <Text variant="body-sm" color="muted">
                {address.city}
                {address.state ? `, ${address.state}` : ''} {address.postalCode}
              </Text>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        <StatTile label="In household" value={String(household.length)} icon={Users} />
        <StatTile
          label="Combined giving"
          value={formatCurrency(combinedGiving)}
          hint="This year, all members"
        />
      </div>

      {/* Members */}
      <div>
        <Text variant="h2" className="mb-3">
          Members
        </Text>
        <Card padding="none" className="divide-y divide-slate-100 dark:divide-slate-800">
          {household.map((member, index) => (
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
                    {index === 0 ? 'Head of household' : 'Member'}
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

      <div className="flex gap-2">
        <Button variant="secondary" fullWidth leftIcon={Phone}>
          Call the house
        </Button>
        <Button variant="secondary" fullWidth leftIcon={Mail}>
          Email all
        </Button>
      </div>
    </div>
  );
}
