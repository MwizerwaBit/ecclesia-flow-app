/**
 * @file RecurrenceControl.tsx
 * @description The "Repeats" field: a builder over the repeat rules the API supports.
 *
 * Nobody types a rule. They pick how often, which days and when it ends, and a
 * plain-words line says what that means ("Every other Sunday until 31 Dec 2026").
 * A rule this builder cannot represent is shown read-only with a Replace button,
 * and is saved unchanged unless they replace it.
 *
 * Until the person picks weekdays or a day of the month themselves, the rule names
 * none: it follows the start date, even when that date is changed afterwards.
 * Once they have chosen their own days and the start date is not one of them, a
 * warning says the first gathering is not part of the series.
 */
import { addDays, type DayKey, weekdayLabel, weekdayOf, weekdayOrder } from '@/lib/calendar';
import { cn } from '@/lib/cn';
import { Button, Card, Input, Select, Text } from '@/components/ui';
import {
  defaultRecurrence,
  describeState,
  FREQUENCIES,
  MAX_COUNT,
  MAX_INTERVAL,
  ORDINAL_LABEL,
  ORDINALS,
  recurrenceProblem,
  startDayMismatch,
  withFrequency,
  type Frequency,
  type Ordinal,
  type RecurrenceEnd,
  type RecurrenceState,
  type RecurrenceValue,
} from './recurrence';

interface RecurrenceControlProps {
  value: RecurrenceValue;
  onChange: (value: RecurrenceValue) => void;
  /** The first gathering's day: the default weekday and day of the month. */
  startDay: DayKey | null;
  /** A message from the server for the rule. */
  error?: string;
  disabled?: boolean;
}

const FREQUENCY_LABEL: Record<Frequency, string> = { DAILY: 'Daily', WEEKLY: 'Weekly', MONTHLY: 'Monthly', YEARLY: 'Yearly' };

const FREQUENCY_OPTIONS = [
  { value: 'NONE', label: 'Does not repeat' },
  ...FREQUENCIES.map((f) => ({ value: f, label: FREQUENCY_LABEL[f] })),
];

const UNIT: Record<Frequency, string> = { DAILY: 'day(s)', WEEKLY: 'week(s)', MONTHLY: 'month(s)', YEARLY: 'year(s)' };

const END_OPTIONS = [
  { value: 'never', label: 'Never' },
  { value: 'until', label: 'On a date' },
  { value: 'count', label: 'After a number of times' },
];

const MONTHLY_OPTIONS = [
  { value: 'day', label: 'A day of the month' },
  { value: 'weekday', label: 'A weekday of the month' },
];

/** A whole number from an input; empty or junk becomes 0, which the rule check then reports. */
const numberOf = (text: string) => (/^\d+$/.test(text) ? Number(text) : 0);

export function RecurrenceControl({ value, onChange, startDay, error, disabled }: RecurrenceControlProps) {
  if (value.kind === 'raw') {
    return (
      <Card variant="flat" padding="md" className="space-y-2">
        <Text variant="label" color="muted">
          Repeats
        </Text>
        <Text as="code" variant="body-sm" className="block font-mono break-all">
          {value.rule}
        </Text>
        <Text variant="caption" color="muted" className="block">
          This repeat rule can’t be edited here. It stays as it is unless you replace it.
        </Text>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={disabled}
          onClick={() => onChange({ kind: 'builder', state: defaultRecurrence(startDay) })}
        >
          Replace
        </Button>
      </Card>
    );
  }

  const state = value.kind === 'builder' ? value.state : null;
  const problem = recurrenceProblem(value, startDay);
  const shownError = problem ?? error;
  const mismatch = state && !problem ? startDayMismatch(state, startDay) : null;

  function patch(change: Partial<RecurrenceState>) {
    if (state) onChange({ kind: 'builder', state: { ...state, ...change } });
  }

  function chooseFrequency(next: string) {
    if (next === 'NONE') return onChange({ kind: 'none' });
    const freq = next as Frequency;
    onChange({
      kind: 'builder',
      state: state ? withFrequency(state, freq, startDay) : defaultRecurrence(startDay, freq),
    });
  }

  return (
    <div className="space-y-3">
      <Select
        label="Repeats"
        value={state?.freq ?? 'NONE'}
        onChange={(e) => chooseFrequency(e.target.value)}
        options={FREQUENCY_OPTIONS}
        disabled={disabled}
      />

      {state && (
        <Card variant="outline" padding="md" className="space-y-4">
          <div className="flex items-end gap-2">
            <Input
              label="Every"
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_INTERVAL}
              value={state.interval || ''}
              onChange={(e) => patch({ interval: numberOf(e.target.value) })}
              className="w-24"
              disabled={disabled}
            />
            <Text variant="body" className="h-11 flex items-center">
              {UNIT[state.freq]}
            </Text>
          </div>

          {state.freq === 'WEEKLY' && (
            <WeekdayChips
              selected={state.weekdays.length > 0 ? state.weekdays : startDay ? [weekdayOf(startDay)] : []}
              onChange={(weekdays) => patch({ weekdays })}
              disabled={disabled}
            />
          )}

          {state.freq === 'MONTHLY' && <MonthlyOptions state={state} startDay={startDay} patch={patch} disabled={disabled} />}

          <div className="space-y-3">
            <Select
              label="Ends"
              value={state.end}
              onChange={(e) => {
                const end = e.target.value as RecurrenceEnd;
                // A date to start from, so choosing "On a date" is never an empty field.
                patch({ end, until: end === 'until' && !state.until && startDay ? addDays(startDay, 90) : state.until });
              }}
              options={END_OPTIONS}
              disabled={disabled}
            />
            {state.end === 'until' && (
              <Input
                label="Last date"
                type="date"
                min={startDay ?? undefined}
                value={state.until}
                onChange={(e) => patch({ until: e.target.value })}
                disabled={disabled}
              />
            )}
            {state.end === 'count' && (
              <Input
                label="Number of times"
                type="number"
                inputMode="numeric"
                min={1}
                max={MAX_COUNT}
                value={state.count || ''}
                onChange={(e) => patch({ count: numberOf(e.target.value) })}
                className="w-40"
                disabled={disabled}
              />
            )}
          </div>

          <Text variant="body-sm" color="muted" aria-live="polite" className="block">
            {problem ? '' : describeState(state, startDay)}
          </Text>
          {mismatch && (
            <Text variant="caption" role="status" className="block text-amber-800 dark:text-amber-300">
              {mismatch}
            </Text>
          )}
        </Card>
      )}

      {shownError && (
        <Text variant="caption" color="danger" role="alert" className="block">
          {shownError}
        </Text>
      )}
    </div>
  );
}

function WeekdayChips({
  selected,
  onChange,
  disabled,
}: {
  selected: number[];
  onChange: (weekdays: number[]) => void;
  disabled?: boolean;
}) {
  function toggle(day: number) {
    if (selected.includes(day)) {
      // A weekly rule needs at least one day.
      if (selected.length > 1) onChange(selected.filter((d) => d !== day));
    } else {
      onChange([...selected, day].sort((a, b) => a - b));
    }
  }

  return (
    <div role="group" aria-label="Repeat on" className="space-y-1.5">
      <Text variant="label" className="block text-slate-700 dark:text-slate-300">
        On
      </Text>
      <div className="flex flex-wrap gap-2">
        {weekdayOrder(0).map((day) => {
          const on = selected.includes(day);
          return (
            <button
              key={day}
              type="button"
              aria-pressed={on}
              aria-label={weekdayLabel(day, 'long')}
              disabled={disabled}
              onClick={() => toggle(day)}
              className={cn(
                'h-11 min-w-11 rounded-full px-3 text-body-sm font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2',
                'disabled:opacity-50',
                on
                  ? 'bg-primary text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700',
              )}
            >
              {weekdayLabel(day, 'short')}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MonthlyOptions({
  state,
  startDay,
  patch,
  disabled,
}: {
  state: RecurrenceState;
  startDay: DayKey | null;
  patch: (change: Partial<RecurrenceState>) => void;
  disabled?: boolean;
}) {
  // A rule with no day named follows the start date; show that day, and make it
  // explicit as soon as it is touched.
  const mode = state.monthlyMode === 'weekday' ? 'weekday' : 'day';
  const monthDay = state.monthlyMode === 'start' && startDay ? Number(startDay.slice(8, 10)) : state.monthDay;

  return (
    <div className="space-y-3">
      <Select
        label="On"
        value={mode}
        onChange={(e) => {
          // With a start date, "a day of the month" is that date's day, and keeps following it.
          if (e.target.value === 'day') return patch(startDay ? { monthlyMode: 'start' } : { monthlyMode: 'day', monthDay });
          // Start from the weekday of the month the first gathering falls on.
          const { ordinal, ordinalWeekday } = defaultRecurrence(startDay, 'MONTHLY');
          patch({ monthlyMode: 'weekday', ordinal, ordinalWeekday });
        }}
        options={MONTHLY_OPTIONS}
        disabled={disabled}
      />
      {mode === 'day' ? (
        <Input
          label="Day of the month"
          type="number"
          inputMode="numeric"
          min={1}
          max={31}
          value={monthDay || ''}
          onChange={(e) => patch({ monthlyMode: 'day', monthDay: numberOf(e.target.value) })}
          className="w-32"
          disabled={disabled}
        />
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <Select
            label="Which"
            value={String(state.ordinal)}
            onChange={(e) => patch({ ordinal: Number(e.target.value) as Ordinal })}
            options={ORDINALS.map((o) => ({ value: String(o), label: ORDINAL_LABEL[o] }))}
            disabled={disabled}
          />
          <Select
            label="Weekday"
            value={String(state.ordinalWeekday)}
            onChange={(e) => patch({ ordinalWeekday: Number(e.target.value) })}
            options={weekdayOrder(0).map((d) => ({ value: String(d), label: weekdayLabel(d, 'long') }))}
            disabled={disabled}
          />
        </div>
      )}
    </div>
  );
}
