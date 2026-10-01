/**
 * @file PricingPage.tsx
 * @description Tier comparison with a monthly/annual toggle.
 *
 * Priced by member count because that is what a church can predict about itself.
 * Annual shows the saving as months free rather than a percentage — "two months
 * free" is a thing a treasurer can put in a budget.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import { Badge, Button, Card, SegmentedControl, Text } from '@/components/ui';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/cn';

type Cycle = 'monthly' | 'annual';

const TIERS = [
  {
    name: 'Seed',
    monthly: 19,
    members: 'Up to 250 members',
    forWho: 'A new or small congregation',
    features: ['Members and visitors', 'Attendance', 'Offerings and funds', 'Announcements'],
  },
  {
    name: 'Parish',
    monthly: 49,
    members: 'Up to 2,000 members',
    forWho: 'An established single church',
    popular: true,
    features: [
      'Everything in Seed',
      'Up to 10 units',
      'Pledges and statements',
      'Certificates',
      'Custom roles',
    ],
  },
  {
    name: 'Growth',
    monthly: 99,
    members: 'Up to 5,000 members',
    forWho: 'A large or multi-site church',
    features: ['Everything in Parish', 'Up to 50 units', 'Analytics', 'SMS notifications'],
  },
  {
    name: 'Diocese',
    monthly: 299,
    members: 'Up to 25,000 members',
    forWho: 'A network of parishes',
    features: [
      'Everything in Growth',
      'Network rollup reporting',
      'Custom domain',
      'White-label branding',
      'API access',
    ],
  },
];

export function PricingPage() {
  const [cycle, setCycle] = useState<Cycle>('monthly');

  // Annual bills ten months for twelve.
  const priceFor = (monthly: number) => (cycle === 'annual' ? (monthly * 10) / 12 : monthly);

  return (
    <div className="w-full px-4 py-12 animate-fade-in">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-8">
          <Text variant="h1" className="mb-2">
            Priced by the size of your congregation
          </Text>
          <Text variant="body-lg" color="muted" className="max-w-lg mx-auto">
            Every tier includes unlimited staff accounts. You are never charged per user.
          </Text>
        </header>

        <div className="max-w-xs mx-auto mb-8">
          <SegmentedControl
            label="Billing cycle"
            value={cycle}
            onChange={setCycle}
            options={[
              { value: 'monthly', label: 'Monthly' },
              { value: 'annual', label: 'Annual' },
            ]}
          />
          {cycle === 'annual' && (
            <Text variant="caption" className="text-success block text-center mt-2">
              Two months free
            </Text>
          )}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {TIERS.map((tier) => (
            <Card
              key={tier.name}
              variant="outline"
              padding="lg"
              className={cn(tier.popular && 'border-primary ring-1 ring-primary/20')}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <Text variant="h2">{tier.name}</Text>
                {tier.popular && (
                  <Badge variant="primary" size="sm">
                    Most chosen
                  </Badge>
                )}
              </div>

              <Text variant="body-sm" color="muted" className="mb-4">
                {tier.forWho}
              </Text>

              <div className="mb-1 flex items-baseline gap-1.5">
                <span className="font-sans text-[2rem] font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                  {formatCurrency(priceFor(tier.monthly)).replace('.00', '')}
                </span>
                <Text variant="body-sm" color="muted">
                  /month
                </Text>
              </div>

              <Text variant="caption" color="muted" className="block mb-5">
                {tier.members}
                {cycle === 'annual' ? ` · billed ${formatCurrency(tier.monthly * 10).replace('.00', '')} yearly` : ''}
              </Text>

              <ul className="space-y-2 mb-6">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check size={15} className="text-success shrink-0 mt-1" aria-hidden />
                    <Text variant="body-sm" color="muted">
                      {feature}
                    </Text>
                  </li>
                ))}
              </ul>

              <Link to="/register">
                <Button variant={tier.popular ? 'primary' : 'secondary'} fullWidth>
                  Start free
                </Button>
              </Link>
            </Card>
          ))}
        </div>

        {/* Enterprise */}
        <Card variant="flat" padding="lg" className="mt-4 text-center">
          <Text variant="h3" className="mb-1">
            Enterprise
          </Text>
          <Text variant="body-sm" color="muted" className="mb-4 max-w-md mx-auto">
            For denominations and national bodies. Custom limits, dedicated support, data residency
            and procurement paperwork.
          </Text>
          <Link to="/contact">
            <Button variant="secondary" rightIcon={ArrowRight}>
              Talk to us
            </Button>
          </Link>
        </Card>

        <Text variant="caption" color="muted" className="block text-center mt-8">
          All tiers include a 30-day free trial. No card required to start. Cancel and export your
          data at any time.
        </Text>
      </div>
    </div>
  );
}
