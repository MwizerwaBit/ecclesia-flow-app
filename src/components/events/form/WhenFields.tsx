/**
 * @file WhenFields.tsx
 * @description When a gathering happens: start, end and the all-day switch, in the church's time zone.
 *
 * The inputs hold the church's own clock. The time zone is stated under them so
 * nobody has to wonder whose "9:00" it is, and while the church's zone is still
 * the untouched default (UTC) a notice points to Settings.
 */
import { Checkbox, Input, Text } from '@/components/ui';
import { TimeZoneNotice } from '../TimeZoneNotice';

interface FieldProps {
  error?: string;
  onBlur: () => void;
  onInput: () => void;
}

interface WhenFieldsProps {
  allDay: boolean;
  start: string;
  end: string;
  zone: string;
  onAllDayChange: (allDay: boolean) => void;
  onStartChange: (start: string) => void;
  onEndChange: (end: string) => void;
  startField: FieldProps;
  endField: FieldProps;
}

export function WhenFields({
  allDay,
  start,
  end,
  zone,
  onAllDayChange,
  onStartChange,
  onEndChange,
  startField,
  endField,
}: WhenFieldsProps) {
  const type = allDay ? 'date' : 'datetime-local';

  return (
    <div className="space-y-3">
      <Checkbox
        label="All day"
        description="Covers whole days instead of a start and end time."
        checked={allDay}
        onChange={(e) => onAllDayChange(e.target.checked)}
      />

      <div className="grid gap-3 xl:grid-cols-2">
        <Input
          label={allDay ? 'First day' : 'Starts'}
          type={type}
          value={start}
          onChange={(e) => onStartChange(e.target.value)}
          required
          {...startField}
        />
        <Input
          label={allDay ? 'Last day (optional)' : 'Ends (optional)'}
          type={type}
          min={start || undefined}
          value={end}
          onChange={(e) => onEndChange(e.target.value)}
          {...endField}
        />
      </div>

      <Text variant="caption" color="muted" className="block">
        {allDay ? 'Days are' : 'Times are'} in {zone} time.
      </Text>
      <TimeZoneNotice zone={zone} />
    </div>
  );
}
