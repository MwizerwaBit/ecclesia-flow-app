/**
 * @file OrganisationSettings.tsx
 * @description Identity and locale for the church — and the way into every other setting.
 *
 * Branding changes are previewed live rather than described, because a colour
 * name means nothing until it is on a button. The palette is a fixed set drawn
 * from the design system: a free colour picker produces unreadable contrast
 * faster than any church admin can be expected to notice.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  Check,
  ChevronRight,
  CreditCard,
  Database,
  Globe,
  Network,
  Palette,
  Plug,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useRole } from '@/hooks/useRole';
import { MediaPicker } from '@/components/media/MediaPicker';
import { Button, Card, Input, Select, Text } from '@/components/ui';
import { cn } from '@/lib/cn';

/** Spiritual palette — each swatch meets AA contrast against white text. */
const BRAND_COLORS = [
  { value: '#4338CA', name: 'Indigo' },
  { value: '#6D28D9', name: 'Violet' },
  { value: '#B45309', name: 'Amber' },
  { value: '#0F766E', name: 'Teal' },
  { value: '#9F1239', name: 'Rose' },
  { value: '#1E3A8A', name: 'Navy' },
  { value: '#3F6212', name: 'Olive' },
  { value: '#7C2D12', name: 'Sienna' },
];

const SETTINGS_LINKS = [
  { href: '/staff/settings/security', label: 'Security', description: 'Password, two-factor, active sessions', icon: ShieldCheck },
  { href: '/staff/settings/notifications', label: 'Notifications', description: 'What reaches you, and how', icon: Bell },
  { href: '/staff/team', label: 'Team & roles', description: 'Who can sign in and what they can do', icon: Users, permission: 'team:read' },
  { href: '/staff/settings/billing', label: 'Plan & billing', description: 'Your plan, usage and invoices', icon: CreditCard, permission: 'org:read' },
  { href: '/staff/settings/integrations', label: 'API & integrations', description: 'Keys and webhooks', icon: Plug, permission: 'org:settings' },
  { href: '/staff/settings/data', label: 'Data & privacy', description: 'Exports, retention, erasure requests', icon: Database, permission: 'org:settings' },
  { href: '/staff/hierarchy', label: 'Structure', description: 'Units, branches and groups', icon: Network, permission: 'hierarchy:read' },
];

export function OrganisationSettings() {
  const { can } = useRole();
  const canEditOrg = can('org:settings');
  const visibleLinks = SETTINGS_LINKS.filter((link) => !link.permission || can(link.permission));
  const [displayName, setDisplayName] = useState('St. Jude’s Parish');
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);
  const [primaryColor, setPrimaryColor] = useState(BRAND_COLORS[0].value);
  const [language, setLanguage] = useState('en');
  const [timezone, setTimezone] = useState('America/Chicago');
  const [dateFormat, setDateFormat] = useState('MDY');
  const [isSaved, setSaved] = useState(false);

  function save() {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2400);
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 animate-fade-in space-y-6">
      <header>
        <Text variant="h1" className="mb-1">
          Settings
        </Text>
        <Text variant="body" color="muted">
          {canEditOrg
            ? 'How your church appears, and how the app behaves.'
            : 'Your personal account settings.'}
        </Text>
      </header>

      {/* Branding — org-admin only; everyone else goes straight to "More" below for their own security/notifications. */}
      {canEditOrg && (
      <>
      <div>
        <Text variant="h2" className="mb-3">
          Branding
        </Text>

        <Card padding="md" className="space-y-5">
          <div>
            <Text variant="label" color="muted" className="mb-2 block">
              Logo
            </Text>
            <div className="flex items-center gap-4">
              {logoUrl ? (
                <img src={logoUrl} alt="" className="size-16 rounded-xl object-cover shrink-0" />
              ) : (
                <div
                  className="flex size-16 items-center justify-center rounded-xl text-white font-display text-h2 shrink-0"
                  style={{ backgroundColor: primaryColor }}
                >
                  {displayName.trim().charAt(0) || 'C'}
                </div>
              )}
              <MediaPicker kind="image" label="Upload a logo" allowLibrary={false} onSelect={(asset) => setLogoUrl(asset.url)} />
            </div>
            <Text variant="caption" color="muted" className="block mt-2">
              A square image works best. Until one is uploaded, your initial stands in.
            </Text>
          </div>

          <Input
            label="Display name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Palette size={16} className="text-slate-400" aria-hidden />
              <Text variant="label" color="muted">
                Primary colour
              </Text>
            </div>
            <div className="grid grid-cols-8 gap-2">
              {BRAND_COLORS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPrimaryColor(option.value)}
                  aria-label={option.name}
                  aria-pressed={primaryColor === option.value}
                  className={cn(
                    'aspect-square rounded-lg flex items-center justify-center transition-transform',
                    primaryColor === option.value
                      ? 'scale-110 ring-2 ring-offset-2 ring-slate-400 dark:ring-offset-background-dark'
                      : 'hover:scale-105',
                  )}
                  style={{ backgroundColor: option.value }}
                >
                  {primaryColor === option.value && (
                    <Check size={14} className="text-white" strokeWidth={3} aria-hidden />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Live preview — the colour on the thing it will actually colour */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <Text variant="label" color="muted" className="mb-3 block">
              Preview
            </Text>
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="h-11 rounded-lg px-4 text-body font-medium text-white"
                style={{ backgroundColor: primaryColor }}
              >
                Add Member
              </button>
              <span
                className="rounded-full px-3 py-1 text-caption font-medium"
                style={{ backgroundColor: `${primaryColor}1A`, color: primaryColor }}
              >
                Active
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Locale */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Globe size={18} className="text-slate-400" aria-hidden />
          <Text variant="h2">Region</Text>
        </div>

        <Card padding="md" className="space-y-4">
          <Select
            label="Language"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            options={[
              { value: 'en', label: 'English' },
              { value: 'fr', label: 'Français' },
              { value: 'es', label: 'Español' },
              { value: 'pt', label: 'Português' },
              { value: 'sw', label: 'Kiswahili' },
            ]}
          />
          <Select
            label="Timezone"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            options={[
              { value: 'America/Chicago', label: 'Central Time (US)' },
              { value: 'America/New_York', label: 'Eastern Time (US)' },
              { value: 'Europe/London', label: 'London' },
              { value: 'Africa/Lagos', label: 'Lagos' },
              { value: 'Africa/Nairobi', label: 'Nairobi' },
            ]}
          />
          <Select
            label="Date format"
            value={dateFormat}
            onChange={(e) => setDateFormat(e.target.value)}
            options={[
              { value: 'MDY', label: 'Oct 27, 2024' },
              { value: 'DMY', label: '27 Oct 2024' },
              { value: 'YMD', label: '2024-10-27' },
            ]}
          />
        </Card>
      </div>

      <Button variant="primary" size="lg" fullWidth onClick={save}>
        {isSaved ? 'Saved' : 'Save changes'}
      </Button>

      {isSaved && (
        <div className="flex items-center justify-center gap-2 animate-fade-in">
          <Check size={16} className="text-success" aria-hidden />
          <Text variant="body-sm" className="text-success">
            Your changes are live for everyone.
          </Text>
        </div>
      )}
      </>
      )}

      {/* Everything else */}
      <div>
        <Text variant="h2" className="mb-3">
          More
        </Text>
        <Card padding="none" className="divide-y divide-slate-100 dark:divide-slate-800">
          {visibleLinks.map(({ href, label, description, icon: Icon }) => (
            <Link
              key={href}
              to={href}
              className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
            >
              <Icon size={20} className="text-slate-400 shrink-0" aria-hidden />
              <div className="min-w-0 flex-1">
                <Text variant="body" className="truncate">
                  {label}
                </Text>
                <Text variant="caption" color="muted" className="truncate block">
                  {description}
                </Text>
              </div>
              <ChevronRight size={18} className="text-slate-300 shrink-0" aria-hidden />
            </Link>
          ))}
        </Card>
      </div>
    </div>
  );
}
