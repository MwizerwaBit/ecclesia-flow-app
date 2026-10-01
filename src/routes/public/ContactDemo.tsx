/**
 * @file ContactDemo.tsx
 * @description Demo request form for Diocese and Enterprise enquiries.
 *
 * Congregation size is asked first because it determines who should reply and
 * whether this is a self-serve signup at all — a 60-member church filling this
 * in should be told to just start the trial instead.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Send } from 'lucide-react';
import { Button, Card, Input, Select, Text } from '@/components/ui';

const SIZES = [
  { value: 'under-250', label: 'Under 250' },
  { value: '250-2000', label: '250 – 2,000' },
  { value: '2000-10000', label: '2,000 – 10,000' },
  { value: 'over-10000', label: 'More than 10,000' },
  { value: 'network', label: 'A network of churches' },
];

export function ContactDemo() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [organisation, setOrganisation] = useState('');
  const [size, setSize] = useState('2000-10000');
  const [message, setMessage] = useState('');
  const [isSent, setSent] = useState(false);

  // Small churches are better served by the trial than by a sales call.
  const shouldSelfServe = size === 'under-250' || size === '250-2000';
  const canSend = name.trim().length > 0 && /.+@.+\..+/.test(email.trim());

  if (isSent) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center animate-fade-in">
        <div className="mb-5 flex size-20 items-center justify-center rounded-full bg-success-light animate-scale-in">
          <Check size={40} className="text-success" strokeWidth={2.5} aria-hidden />
        </div>
        <Text variant="h2" className="mb-2">
          Thank you — we have it
        </Text>
        <Text variant="body" color="muted" className="max-w-sm mb-8">
          Someone will be in touch within one working day. If it is urgent, reply to the
          confirmation email and it will reach us faster.
        </Text>
        <Link to="/">
          <Button variant="secondary">Back to the homepage</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-12 animate-fade-in space-y-5">
      <header>
        <Text variant="h1" className="mb-2">
          Talk to us
        </Text>
        <Text variant="body-lg" color="muted">
          For dioceses, denominations and anything that needs a conversation first.
        </Text>
      </header>

      <Input
        label="Your name"
        autoFocus
        autoComplete="name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <Input
        label="Email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <Input
        label="Church or organisation"
        value={organisation}
        onChange={(e) => setOrganisation(e.target.value)}
      />

      <Select
        label="How many members"
        value={size}
        onChange={(e) => setSize(e.target.value)}
        options={SIZES}
      />

      {/* Honest redirection rather than a sales call they don't need */}
      {shouldSelfServe && (
        <Card variant="outline" padding="md" className="border-primary/30 bg-primary-light/40">
          <Text variant="body-sm" className="mb-3">
            At your size you do not need to wait for us. The trial gives you everything immediately,
            and you can still write to us with questions.
          </Text>
          <Link to="/register">
            <Button variant="primary" size="sm" rightIcon={ArrowRight}>
              Start the free trial instead
            </Button>
          </Link>
        </Card>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="contact-message" className="text-label text-slate-700 dark:text-slate-300">
          What would you like to know?
        </label>
        <textarea
          id="contact-message"
          rows={4}
          placeholder="Optional"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-surface dark:bg-surface-dark px-3 py-2.5 text-body text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <Button
        variant="primary"
        size="lg"
        fullWidth
        leftIcon={Send}
        disabled={!canSend}
        onClick={() => setSent(true)}
      >
        Send
      </Button>

      <Text variant="caption" color="muted" className="block text-center">
        We use what you send here to reply to you, and nothing else.
      </Text>
    </div>
  );
}
