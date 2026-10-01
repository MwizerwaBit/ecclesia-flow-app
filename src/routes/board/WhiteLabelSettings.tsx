/**
 * @file WhiteLabelSettings.tsx
 * @description Remove EcclesiaFlow's branding and put the church's in its place.
 *
 * Available to Diocese and Enterprise tiers. Custom CSS is offered last and
 * framed as an escape hatch — it can break the portal, and saying so plainly is
 * better than discovering it after a deploy.
 */
import { useState } from 'react';
import { Check, Code2, Globe, Mail, Sparkles } from 'lucide-react';
import { Badge, Button, Card, Checkbox, Input, Text } from '@/components/ui';

export function WhiteLabelSettings() {
  const [senderName, setSenderName] = useState("St. Jude's Parish");
  const [senderEmail, setSenderEmail] = useState('office@stjudes.org');
  const [customDomain, setCustomDomain] = useState('portal.stjudes.org');
  const [hideBranding, setHideBranding] = useState(true);
  const [customCss, setCustomCss] = useState('');
  const [isSaved, setSaved] = useState(false);

  function save() {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2400);
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 animate-fade-in space-y-6">
      <header>
        <div className="flex items-center gap-2 mb-1">
          <Text variant="h1">White-label</Text>
          <Badge variant="primary" size="sm">
            Diocese
          </Badge>
        </div>
        <Text variant="body" color="muted">
          Make the portal look like it belongs to your church, not to us.
        </Text>
      </header>

      {/* Email identity */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Mail size={18} className="text-slate-400" aria-hidden />
          <Text variant="h2">Email</Text>
        </div>

        <Card padding="md" className="space-y-4">
          <Input
            label="Sender name"
            value={senderName}
            onChange={(e) => setSenderName(e.target.value)}
          />
          <Input
            label="Reply-to address"
            type="email"
            value={senderEmail}
            onChange={(e) => setSenderEmail(e.target.value)}
          />
          <Text variant="caption" color="muted">
            Announcements and statements will arrive from this name. Delivery still runs through our
            infrastructure, so your domain needs our SPF record.
          </Text>
        </Card>
      </div>

      {/* Domain */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Globe size={18} className="text-slate-400" aria-hidden />
          <Text variant="h2">Domain</Text>
        </div>

        <Card padding="md" className="space-y-4">
          <Input
            label="Portal domain"
            value={customDomain}
            onChange={(e) => setCustomDomain(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <Check size={16} className="text-success shrink-0" aria-hidden />
            <Text variant="body-sm" className="text-success">
              Verified and serving over HTTPS.
            </Text>
          </div>
        </Card>
      </div>

      {/* Branding */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={18} className="text-slate-400" aria-hidden />
          <Text variant="h2">Branding</Text>
        </div>

        <Card padding="md">
          <Checkbox
            label="Hide EcclesiaFlow branding"
            description="Removes our name and logo from the portal footer and outgoing email."
            checked={hideBranding}
            onChange={(e) => setHideBranding(e.target.checked)}
          />
        </Card>
      </div>

      {/* Escape hatch, framed honestly */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Code2 size={18} className="text-slate-400" aria-hidden />
          <Text variant="h2">Custom CSS</Text>
        </div>

        <Card padding="md" className="space-y-3">
          <textarea
            rows={6}
            spellCheck={false}
            placeholder={'.portal-header {\n  border-bottom: 2px solid #B45309;\n}'}
            value={customCss}
            onChange={(e) => setCustomCss(e.target.value)}
            aria-label="Custom CSS"
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2.5 font-mono text-body-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <Text variant="caption" color="muted">
            This is applied to the member portal exactly as written. Bad CSS here can make the portal
            unusable on phones, and we cannot validate it for you — test on a device before saving.
          </Text>
        </Card>
      </div>

      <Button variant="primary" size="lg" fullWidth onClick={save}>
        {isSaved ? 'Saved' : 'Save white-label settings'}
      </Button>

      {isSaved && (
        <div className="flex items-center justify-center gap-2 animate-fade-in">
          <Check size={16} className="text-success" aria-hidden />
          <Text variant="body-sm" className="text-success">
            Live for every member of your organisation.
          </Text>
        </div>
      )}
    </div>
  );
}
