/**
 * @file ContactActions.tsx
 * @description Call, WhatsApp and email a person — as links that actually open.
 *
 * These were buttons with no handler on five screens. They are not buttons at
 * all: `tel:`, `https://wa.me/` and `mailto:` hand off to the phone's dialler,
 * WhatsApp and mail client, which is exactly the behaviour wanted and needs no
 * backend. A channel with no number or address on file is omitted rather than
 * rendered dead.
 */
import { Mail, MessageCircle, Phone } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from './Button';

interface ContactActionsProps {
  name: string;
  phone?: string;
  email?: string;
  /** Defaults to `phone` — most people use one number for both. */
  whatsapp?: string;
  size?: 'sm' | 'md';
  /** Each action fills an equal share of the row. */
  fullWidth?: boolean;
  variant?: 'ghost' | 'secondary';
  className?: string;
}

/** wa.me wants digits only — no spaces, braces or leading plus. */
function toWhatsAppNumber(raw: string): string {
  return raw.replace(/[^\d]/g, '');
}

export function ContactActions({
  name,
  phone,
  email,
  whatsapp,
  size = 'sm',
  fullWidth = true,
  variant = 'ghost',
  className,
}: ContactActionsProps) {
  const whatsappNumber = whatsapp ?? phone;
  const subject = encodeURIComponent(`A message from your church`);

  if (!phone && !email) {
    return (
      <div className={cn('px-3 py-2', className)}>
        <span className="text-caption text-slate-400">No contact details on file</span>
      </div>
    );
  }

  return (
    <div className={cn('flex gap-1', className)}>
      {phone && (
        <a href={`tel:${phone}`} className={fullWidth ? 'flex-1' : undefined} aria-label={`Call ${name}`}>
          <Button variant={variant} size={size} leftIcon={Phone} fullWidth={fullWidth}>
            Call
          </Button>
        </a>
      )}

      {whatsappNumber && (
        <a
          href={`https://wa.me/${toWhatsAppNumber(whatsappNumber)}`}
          target="_blank"
          rel="noreferrer"
          className={fullWidth ? 'flex-1' : undefined}
          aria-label={`Message ${name} on WhatsApp`}
        >
          <Button variant={variant} size={size} leftIcon={MessageCircle} fullWidth={fullWidth}>
            WhatsApp
          </Button>
        </a>
      )}

      {email && (
        <a
          href={`mailto:${email}?subject=${subject}`}
          className={fullWidth ? 'flex-1' : undefined}
          aria-label={`Email ${name}`}
        >
          <Button variant={variant} size={size} leftIcon={Mail} fullWidth={fullWidth}>
            Email
          </Button>
        </a>
      )}
    </div>
  );
}
