/**
 * @file LandingPage.tsx
 * @description The public front door.
 *
 * Written for church leaders rather than for buyers of software: the hero speaks
 * about ministry, and the proof points are the specific, unglamorous things that
 * actually take a secretary's Sunday morning.
 */
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  Banknote,
  CalendarCheck,
  HeartHandshake,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { Button, Card, Text } from '@/components/ui';

const FEATURES = [
  {
    icon: CalendarCheck,
    title: 'Attendance in five minutes',
    body: 'Mark eighty-seven people present on a phone, one-handed, before the service starts.',
  },
  {
    icon: Banknote,
    title: 'Offerings that reconcile',
    body: 'Envelope number, fund, amount, next. The counted total is checked against what was entered.',
  },
  {
    icon: HeartHandshake,
    title: 'Nobody slips away',
    body: 'Anyone who misses four weeks appears on a list, with one tap to reach out.',
  },
  {
    icon: Users,
    title: 'Every tradition',
    body: 'Parish, mosque, temple, branch, zone — you name your own structure and we use your words.',
  },
  {
    icon: Award,
    title: 'Certificates that verify',
    body: 'Issue baptism and membership certificates with a QR code anyone can check.',
  },
  {
    icon: ShieldCheck,
    title: 'Pastoral notes stay private',
    body: 'Confidential notes are permission-locked and never readable by support staff.',
  },
];

const TESTIMONIALS = [
  {
    quote:
      'Our secretary is sixty-two and had never used anything like this. She was taking the register on her own by the second Sunday.',
    attribution: 'Fr. Michael O’Brien',
    org: 'St. Jude’s Parish',
  },
  {
    quote:
      'Counting used to take three of us two hours. It now takes two of us forty minutes, and the numbers actually balance.',
    attribution: 'Katherine Lee',
    org: 'Treasurer, Grace Chapel',
  },
];

export function LandingPage() {
  return (
    <div className="w-full animate-fade-in">
      {/* Hero */}
      <section className="px-4 pt-16 pb-12 text-center max-w-2xl mx-auto">
        <Text variant="label" color="muted" className="mb-4 block">
          Church management, made human
        </Text>

        <h1 className="font-display text-[2.5rem] leading-[1.1] font-semibold text-slate-900 dark:text-slate-100 mb-5">
          The software should honour the work.
        </h1>

        <Text variant="body-lg" color="muted" className="mb-8 max-w-lg mx-auto">
          EcclesiaFlow handles the register, the offering and the follow-up, so the people who run
          your church can spend their time on people.
        </Text>

        <div className="flex flex-col lg:flex-row gap-3 justify-center">
          <Link to="/register">
            <Button variant="primary" size="lg" rightIcon={ArrowRight}>
              Start free for 30 days
            </Button>
          </Link>
          <Link to="/pricing">
            <Button variant="secondary" size="lg">
              See pricing
            </Button>
          </Link>
        </div>

        <Text variant="caption" color="muted" className="block mt-4">
          No card needed. Your data is yours, and exportable at any time.
        </Text>
      </section>

      {/* Features */}
      <section className="px-4 py-12 bg-surface dark:bg-surface-dark">
        <div className="max-w-4xl mx-auto">
          <Text variant="h2" className="text-center mb-8">
            Built around the Sunday, not the spreadsheet
          </Text>

          <div className="grid gap-4 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <Card key={title} variant="outline" padding="md">
                <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-primary-light dark:bg-primary/15">
                  <Icon size={20} className="text-primary" aria-hidden />
                </div>
                <Text variant="h3" className="mb-1">
                  {title}
                </Text>
                <Text variant="body-sm" color="muted">
                  {body}
                </Text>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="px-4 py-12">
        <div className="max-w-2xl mx-auto space-y-4">
          <Text variant="h2" className="text-center mb-6">
            From churches already using it
          </Text>

          {TESTIMONIALS.map((testimonial) => (
            <Card key={testimonial.attribution} padding="lg">
              <Text variant="body-lg" className="font-display italic mb-4">
                &ldquo;{testimonial.quote}&rdquo;
              </Text>
              <Text variant="body-sm" className="font-medium">
                {testimonial.attribution}
              </Text>
              <Text variant="caption" color="muted">
                {testimonial.org}
              </Text>
            </Card>
          ))}
        </div>
      </section>

      {/* Close */}
      <section className="px-4 py-16 text-center">
        <div className="max-w-xl mx-auto">
          <Text variant="h2" className="mb-3">
            Your congregation starts here
          </Text>
          <Text variant="body" color="muted" className="mb-6">
            Set up takes about ten minutes. You can have your first service on the register this
            Sunday.
          </Text>
          <Link to="/register">
            <Button variant="primary" size="lg" rightIcon={ArrowRight}>
              Start free
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-200 dark:border-slate-800 px-4 py-8">
        <div className="max-w-4xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-4">
          <Text variant="body-sm" color="muted">
            EcclesiaFlow
          </Text>
          <nav className="flex gap-5">
            <Link to="/pricing" className="text-body-sm text-slate-500 hover:text-primary transition-colors">
              Pricing
            </Link>
            <Link to="/churches" className="text-body-sm text-slate-500 hover:text-primary transition-colors">
              Find a church
            </Link>
            <Link to="/contact" className="text-body-sm text-slate-500 hover:text-primary transition-colors">
              Contact
            </Link>
            <Link to="/login" className="text-body-sm text-slate-500 hover:text-primary transition-colors">
              Sign in
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
