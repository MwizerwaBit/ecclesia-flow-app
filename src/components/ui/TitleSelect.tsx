/**
 * @file TitleSelect.tsx
 * @description Picks a person's title (Mr, Dr, Rev, Fr, Ev, Prophet…).
 *
 * The common ones are a list; "Other" lets a church record one that isn't, so
 * nobody is told their title doesn't exist. A title already saved that isn't in
 * the list opens as "Other" with its text intact, never silently dropped.
 */
import { useState } from 'react';
import { TITLES } from '@/lib/people';
import { Input } from './Input';
import { Select } from './Select';

const OTHER = '__other__';

interface TitleSelectProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  /** Autofill token: "honorific-prefix" for your own title, "off" when entering someone else's. */
  autoComplete?: string;
}

export function TitleSelect({ value, onChange, label = 'Title', autoComplete = 'off' }: TitleSelectProps) {
  const isKnown = TITLES.some((t) => t.value === value);
  // Once someone picks "Other", stay in it while they type, even if the box is briefly empty.
  const [other, setOther] = useState(Boolean(value) && !isKnown);
  const showOther = other || (Boolean(value) && !isKnown);

  return (
    <div className="space-y-3">
      <Select
        label={label}
        autoComplete={autoComplete}
        value={showOther ? OTHER : value}
        onChange={(e) => {
          const next = e.target.value;
          if (next === OTHER) {
            setOther(true);
            if (isKnown) onChange('');
          } else {
            setOther(false);
            onChange(next);
          }
        }}
        options={[
          { value: '', label: 'None' },
          ...TITLES.map((t) => ({ value: t.value, label: t.meaning === t.value ? t.value : `${t.value} · ${t.meaning}` })),
          { value: OTHER, label: 'Other…' },
        ]}
      />
      {showOther && (
        <Input
          label="Their title"
          placeholder="e.g. Chief, Rt Rev, Mama"
          maxLength={30}
          autoComplete="off"
          value={isKnown ? '' : value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}
