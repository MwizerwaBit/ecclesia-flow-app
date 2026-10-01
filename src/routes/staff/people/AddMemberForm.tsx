/**
 * @file AddMemberForm.tsx
 * @description The full member record, captured in three steps.
 *
 * Split deliberately: name and contact first, church details second, personal
 * details last and entirely optional. Someone can be saved after step one —
 * the steps that follow enrich a record that already exists, so a half-finished
 * form never means a lost person.
 */
import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, UserPlus } from 'lucide-react';
import type { MemberStatus } from '@/types';
import { membersService } from '@/services/membersService';
import { commsService } from '@/services/commsService';
import { Button, Card, Input, Select, Text } from '@/components/ui';
import { cn } from '@/lib/cn';

type Step = 1 | 2 | 3;

const STEP_LABELS: Record<Step, string> = {
  1: 'Who they are',
  2: 'Church details',
  3: 'Personal details',
};

const STATUS_OPTIONS: Array<{ value: MemberStatus; label: string }> = [
  { value: 'active', label: 'Member' },
  { value: 'visitor', label: 'Visitor' },
  { value: 'prospect', label: 'Prospect' },
  { value: 'inactive', label: 'Inactive' },
];

export function AddMemberForm() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const [status, setStatus] = useState<MemberStatus>('active');
  const [unitId, setUnitId] = useState('');
  const [envelopeNumber, setEnvelopeNumber] = useState('');

  const [dateOfBirth, setDateOfBirth] = useState('');
  const [occupation, setOccupation] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [city, setCity] = useState('');

  const { data: units = [] } = useQuery({
    queryKey: ['units'],
    queryFn: () => commsService.listUnits(),
  });

  const canContinue = firstName.trim().length > 0 && lastName.trim().length > 0;

  const createMember = useMutation({
    mutationFn: () =>
      membersService.create({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        status,
        unitId: unitId || undefined,
        unitName: units.find((u) => u.id === unitId)?.name,
        envelopeNumber: envelopeNumber.trim() || undefined,
        dateOfBirth: dateOfBirth || undefined,
        occupation: occupation.trim() || undefined,
        address: addressLine1.trim()
          ? { line1: addressLine1.trim(), city: city.trim(), country: 'US' }
          : undefined,
      }),
    onSuccess: (member) => navigate(`/staff/members/${member.id}`),
  });

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 animate-fade-in">
      <header className="mb-6">
        <Text variant="h1" className="mb-1">
          Add a person
        </Text>
        <Text variant="body" color="muted">
          {STEP_LABELS[step]}
        </Text>
      </header>

      {/* Progress dots */}
      <div className="flex items-center gap-2 mb-6" role="group" aria-label="Form progress">
        {([1, 2, 3] as Step[]).map((n) => (
          <div
            key={n}
            className={cn(
              'h-1.5 flex-1 rounded-full transition-colors duration-slow',
              n <= step ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700',
            )}
          />
        ))}
      </div>

      <Card padding="md" className="space-y-4">
        {step === 1 && (
          <>
            <Input
              label="First name"
              autoFocus
              autoComplete="given-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
            <Input
              label="Last name"
              autoComplete="family-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
            <Input
              label="Email"
              type="email"
              autoComplete="email"
              placeholder="Optional"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              label="Phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="Optional"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </>
        )}

        {step === 2 && (
          <>
            <Select
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value as MemberStatus)}
              options={STATUS_OPTIONS}
            />
            <Select
              label="Group"
              value={unitId}
              onChange={(e) => setUnitId(e.target.value)}
              options={[
                { value: '', label: 'No group yet' },
                ...units.map((u) => ({ value: u.id, label: u.name })),
              ]}
            />
            <Input
              label="Envelope number"
              inputMode="numeric"
              placeholder="Optional"
              value={envelopeNumber}
              onChange={(e) => setEnvelopeNumber(e.target.value)}
            />
            <Text variant="caption" color="muted">
              An envelope number lets the counting team credit giving without searching by name.
            </Text>
          </>
        )}

        {step === 3 && (
          <>
            <Input
              label="Date of birth"
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
            />
            <Input
              label="Occupation"
              placeholder="Optional"
              value={occupation}
              onChange={(e) => setOccupation(e.target.value)}
            />
            <Input
              label="Address"
              placeholder="Optional"
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
            />
            <Input
              label="Town or city"
              placeholder="Optional"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </>
        )}
      </Card>

      <div className="flex gap-3 mt-6">
        {step > 1 && (
          <Button
            variant="ghost"
            leftIcon={ArrowLeft}
            onClick={() => setStep((s) => (s - 1) as Step)}
          >
            Back
          </Button>
        )}

        {step < 3 ? (
          <Button
            variant="primary"
            fullWidth
            rightIcon={ArrowRight}
            disabled={step === 1 && !canContinue}
            onClick={() => setStep((s) => (s + 1) as Step)}
          >
            Continue
          </Button>
        ) : (
          <Button
            variant="primary"
            fullWidth
            leftIcon={Check}
            isLoading={createMember.isPending}
            onClick={() => createMember.mutate()}
          >
            Save person
          </Button>
        )}
      </div>

      {/* Saving early is encouraged rather than hidden */}
      {step < 3 && canContinue && (
        <Button
          variant="link"
          fullWidth
          leftIcon={UserPlus}
          className="mt-4"
          isLoading={createMember.isPending}
          onClick={() => createMember.mutate()}
        >
          Save now and finish later
        </Button>
      )}
    </div>
  );
}
