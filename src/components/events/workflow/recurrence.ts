/**
 * @file recurrence.ts
 * @description An iCalendar RRULE as a sentence a person would say.
 *
 * "FREQ=WEEKLY;BYDAY=SU;INTERVAL=2" reads "Every other Sunday". Only the rules a
 * church form can produce are spelled out; anything stranger falls back to a
 * plain "Repeats on a custom schedule" rather than a wrong sentence.
 *
 * This is the one describer: the event card, the detail pages, the history and
 * the form's live preview all say a rule the same way. A rule that names no day
 * ("FREQ=WEEKLY") repeats on the first gathering's day; give `startDay` and the
 * sentence says which ("Every Sunday") instead of the vaguer "Every week".
 */
import { dayKeyInZone, formatDay, parseDayKey, weekdayOf, type DayKey } from '@/lib/calendar';

/** RRULE weekday codes, indexed 0 = Sunday. */
const DAY_CODES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

const DAY_NAME: Record<string, string> = {
  SU: 'Sunday',
  MO: 'Monday',
  TU: 'Tuesday',
  WE: 'Wednesday',
  TH: 'Thursday',
  FR: 'Friday',
  SA: 'Saturday',
};

const ORDINAL: Record<string, string> = {
  '1': 'First',
  '2': 'Second',
  '3': 'Third',
  '4': 'Fourth',
  '5': 'Fifth',
  '-1': 'Last',
  '-2': 'Second to last',
};

const CUSTOM = 'Repeats on a custom schedule';

function parse(rule: string): Record<string, string> {
  const parts: Record<string, string> = {};
  for (const piece of rule.replace(/^RRULE:/i, '').split(';')) {
    const [key, ...rest] = piece.split('=');
    if (key && rest.length) parts[key.trim().toUpperCase()] = rest.join('=').trim().toUpperCase();
  }
  return parts;
}

/** "Monday, Wednesday and Friday". */
function list(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

function ordinalDay(n: number): string {
  if (n === -1) return 'Last day';
  const mod100 = n % 100;
  const suffix = mod100 >= 11 && mod100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th';
  return `${n}${suffix}`;
}

/** "every month", "every other month", "every 3 months". */
function every(interval: number, unit: string): string {
  if (interval === 1) return `every ${unit}`;
  if (interval === 2) return `every other ${unit}`;
  return `every ${interval} ${unit}s`;
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** The day an UNTIL value names, in the church's zone when it is a UTC instant. */
function untilText(value: string, zone?: string): string | null {
  const match = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/.exec(value);
  if (!match) return null;
  const [, y, m, d, hh, mm, ss, utc] = match;
  let day = `${y}-${m}-${d}`;
  if (utc && zone) {
    day = dayKeyInZone(new Date(Date.UTC(+y, +m - 1, +d, +hh, +mm, +ss)), zone);
  }
  return formatDay(day, { month: 'short', day: 'numeric', year: 'numeric' });
}

function ending(parts: Record<string, string>, zone?: string): string {
  if (parts.COUNT) {
    const count = Number(parts.COUNT);
    return Number.isInteger(count) && count > 0 ? `, ${count} ${count === 1 ? 'time' : 'times'}` : '';
  }
  if (parts.UNTIL) {
    const until = untilText(parts.UNTIL, zone);
    return until ? `, until ${until}` : '';
  }
  return '';
}

/** The weekday codes of a BYDAY value: [{ ordinal: '1', code: 'SU' }]. Null if one is unreadable. */
function weekdays(byDay: string): { ordinal: string; code: string }[] | null {
  const out: { ordinal: string; code: string }[] = [];
  for (const token of byDay.split(',')) {
    const match = /^([+-]?\d{1,2})?(SU|MO|TU|WE|TH|FR|SA)$/.exec(token.trim());
    if (!match) return null;
    out.push({ ordinal: match[1]?.replace('+', '') ?? '', code: match[2] });
  }
  return out;
}

const WEEKDAY_SET = ['MO', 'TU', 'WE', 'TH', 'FR'];

/**
 * @param rule  an RRULE ("FREQ=WEEKLY;BYDAY=SU"), with or without the "RRULE:" prefix
 * @param zone  the church's zone, used only to place an UNTIL instant on its day
 * @param startDay  the church day of the first gathering: names the weekday, day of
 *                  the month or date that a rule without one repeats on
 */
export function describeRecurrence(rule: string | null | undefined, zone?: string, startDay?: DayKey | null): string {
  if (!rule || !rule.trim()) return 'Does not repeat';
  const parts = parse(rule);
  const interval = parts.INTERVAL === undefined ? 1 : Number(parts.INTERVAL);
  if (!Number.isInteger(interval) || interval < 1) return CUSTOM;
  const days = parts.BYDAY ? weekdays(parts.BYDAY) : [];
  if (!days) return CUSTOM;
  const tail = ending(parts, zone);

  switch (parts.FREQ) {
    case 'DAILY':
      return capitalize(every(interval, 'day')) + tail;

    case 'WEEKLY': {
      if (days.some((d) => d.ordinal)) return CUSTOM;
      const codes = days.map((d) => d.code);
      if (codes.length === 0 && startDay) codes.push(DAY_CODES[weekdayOf(startDay)]);
      if (codes.length === 0) return capitalize(every(interval, 'week')) + tail;
      if (codes.length === 7 && interval === 1) return `Every day${tail}`;
      const isWeekdays = codes.length === 5 && WEEKDAY_SET.every((c) => codes.includes(c));
      const names = list(codes.map((c) => DAY_NAME[c]));
      if (interval === 1) return `Every ${isWeekdays ? 'weekday' : names}${tail}`;
      if (codes.length === 1 && interval === 2) return `Every other ${names}${tail}`;
      return `${capitalize(every(interval, 'week'))} on ${isWeekdays ? 'weekdays' : names}${tail}`;
    }

    case 'MONTHLY': {
      const month = every(interval, 'month');
      // "BYDAY=SU;BYSETPOS=1" is the same rule as "BYDAY=1SU".
      const setPos = parts.BYSETPOS && !parts.BYSETPOS.includes(',') ? parts.BYSETPOS.replace('+', '') : '';
      if (days.length === 1 && (days[0].ordinal || setPos)) {
        const ordinal = ORDINAL[days[0].ordinal || setPos];
        if (!ordinal) return CUSTOM;
        return `${ordinal} ${DAY_NAME[days[0].code]} of ${month}${tail}`;
      }
      if (days.length > 0) return CUSTOM;
      if (parts.BYMONTHDAY) {
        const dates = parts.BYMONTHDAY.split(',').map(Number);
        if (dates.some((n) => !Number.isInteger(n) || n === 0 || n > 31 || n < -1)) return CUSTOM;
        return `${list(dates.map(ordinalDay))} of ${month}${tail}`;
      }
      if (startDay) return `${ordinalDay(parseDayKey(startDay).day)} of ${month}${tail}`;
      return capitalize(month) + tail;
    }

    case 'YEARLY': {
      const year = capitalize(every(interval, 'year'));
      if (days.length > 0) return CUSTOM;
      const start = startDay ? parseDayKey(startDay) : null;
      const monthNumber = parts.BYMONTH ? Number(parts.BYMONTH) : (start?.month ?? 0);
      const date = parts.BYMONTHDAY ? Number(parts.BYMONTHDAY) : (start?.day ?? 0);
      if (monthNumber >= 1 && monthNumber <= 12 && date >= 1 && date <= 31) {
        const on = formatDay(`2024-${String(monthNumber).padStart(2, '0')}-${String(date).padStart(2, '0')}`, {
          month: 'long',
          day: 'numeric',
        });
        return `${year} on ${on}${tail}`;
      }
      return year + tail;
    }

    default:
      return CUSTOM;
  }
}
