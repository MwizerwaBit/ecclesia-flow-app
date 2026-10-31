// @vitest-environment jsdom
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { RecurrenceControl } from './RecurrenceControl';
import { recurrenceFromRule, ruleFromRecurrence, type RecurrenceValue } from './recurrence';

// 2026-03-08 is a Sunday.
function Harness({ rule, startDay = '2026-03-08' }: { rule: string; startDay?: string }) {
  const [value, setValue] = useState<RecurrenceValue>(recurrenceFromRule(rule));
  return (
    <>
      <RecurrenceControl value={value} onChange={setValue} startDay={startDay} />
      <output data-testid="rule">{ruleFromRecurrence(value)}</output>
    </>
  );
}

// The same, with the start date supplied from outside so a test can move it.
function Follower({ startDay }: { startDay: string }) {
  const [value, setValue] = useState<RecurrenceValue>(recurrenceFromRule(''));
  return (
    <>
      <RecurrenceControl value={value} onChange={setValue} startDay={startDay} />
      <output data-testid="rule">{ruleFromRecurrence(value)}</output>
    </>
  );
}

afterEach(cleanup);

const rule = () => screen.getByTestId('rule').textContent;

describe('RecurrenceControl', () => {
  it('shows no builder while it does not repeat', () => {
    render(<Harness rule="" />);
    expect(rule()).toBe('');
    expect(screen.queryByLabelText('Every')).toBeNull();
  });

  it('starts a weekly rule that follows the start date until a weekday is chosen', () => {
    render(<Harness rule="" />);
    fireEvent.change(screen.getByLabelText('Repeats'), { target: { value: 'WEEKLY' } });
    // No weekday is written, so the server uses whatever day the start date is.
    expect(rule()).toBe('FREQ=WEEKLY');
    expect(screen.getByRole('button', { name: 'Sunday' })).toHaveProperty('ariaPressed', 'true');
    expect(screen.getByText('Every Sunday')).toBeTruthy();
    // Touching a day makes the choice explicit.
    fireEvent.click(screen.getByRole('button', { name: 'Wednesday' }));
    expect(rule()).toBe('FREQ=WEEKLY;BYDAY=SU,WE');
  });

  it('follows a start date that changes while the rule names no day', () => {
    const { rerender } = render(<Follower startDay="2026-03-08" />);
    fireEvent.change(screen.getByLabelText('Repeats'), { target: { value: 'WEEKLY' } });
    rerender(<Follower startDay="2026-03-11" />);
    expect(rule()).toBe('FREQ=WEEKLY');
    expect(screen.getByRole('button', { name: 'Wednesday' })).toHaveProperty('ariaPressed', 'true');
    expect(screen.getByText('Every Wednesday')).toBeTruthy();
    expect(screen.queryByText(/won’t be part of the series/)).toBeNull();
  });

  it('starts a monthly rule on the start date day without naming it', () => {
    render(<Harness rule="" />);
    fireEvent.change(screen.getByLabelText('Repeats'), { target: { value: 'MONTHLY' } });
    expect(rule()).toBe('FREQ=MONTHLY');
    expect((screen.getByLabelText('Day of the month') as HTMLInputElement).value).toBe('8');
    fireEvent.change(screen.getByLabelText('Day of the month'), { target: { value: '15' } });
    expect(rule()).toBe('FREQ=MONTHLY;BYMONTHDAY=15');
  });

  it('warns when the start date is not one of the chosen weekdays', () => {
    // 2026-03-11 is a Wednesday.
    render(<Harness rule="FREQ=WEEKLY;BYDAY=SU" startDay="2026-03-11" />);
    expect(screen.getByText(/first gathering is on a Wednesday/).textContent).toMatch(/won’t be part of the series/);
  });

  it('builds an every-other-week rule with an end date and says it in words', () => {
    render(<Harness rule="FREQ=WEEKLY;BYDAY=SU" />);
    fireEvent.change(screen.getByLabelText('Every'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('Ends'), { target: { value: 'until' } });
    fireEvent.change(screen.getByLabelText('Last date'), { target: { value: '2026-12-31' } });
    expect(rule()).toBe('FREQ=WEEKLY;INTERVAL=2;BYDAY=SU;UNTIL=20261231');
    expect(screen.getByText('Every other Sunday, until Dec 31, 2026')).toBeTruthy();
  });

  it('keeps at least one weekday selected', () => {
    render(<Harness rule="FREQ=WEEKLY;BYDAY=SU" />);
    fireEvent.click(screen.getByRole('button', { name: 'Sunday' }));
    expect(rule()).toBe('FREQ=WEEKLY;BYDAY=SU');
    fireEvent.click(screen.getByRole('button', { name: 'Wednesday' }));
    expect(rule()).toBe('FREQ=WEEKLY;BYDAY=SU,WE');
  });

  it('switches between a count and an end date, never both', () => {
    render(<Harness rule="FREQ=DAILY;COUNT=5" />);
    fireEvent.change(screen.getByLabelText('Ends'), { target: { value: 'until' } });
    expect(rule()).toMatch(/^FREQ=DAILY;UNTIL=\d{8}$/);
    fireEvent.change(screen.getByLabelText('Ends'), { target: { value: 'never' } });
    expect(rule()).toBe('FREQ=DAILY');
  });

  it('builds a monthly weekday rule from the start date', () => {
    render(<Harness rule="FREQ=MONTHLY" />);
    fireEvent.change(screen.getByLabelText('On'), { target: { value: 'weekday' } });
    // The second Sunday of March 2026.
    expect(rule()).toBe('FREQ=MONTHLY;BYDAY=2SU');
    fireEvent.change(screen.getByLabelText('Which'), { target: { value: '-1' } });
    expect(rule()).toBe('FREQ=MONTHLY;BYDAY=-1SU');
  });

  it('reports a problem and says nothing in words while the rule is incomplete', () => {
    render(<Harness rule="FREQ=WEEKLY;BYDAY=SU" />);
    fireEvent.change(screen.getByLabelText('Every'), { target: { value: '' } });
    expect(screen.getByRole('alert').textContent).toMatch(/1 to 52/);
  });

  it('shows a rule it cannot edit read-only and keeps it until replaced', () => {
    render(<Harness rule="FREQ=MONTHLY;BYDAY=5SU" />);
    expect(screen.getByText('FREQ=MONTHLY;BYDAY=5SU', { selector: 'code' })).toBeTruthy();
    expect(screen.queryByLabelText('Repeats')).toBeNull();
    expect(rule()).toBe('FREQ=MONTHLY;BYDAY=5SU');
    fireEvent.click(screen.getByRole('button', { name: 'Replace' }));
    expect(rule()).toBe('FREQ=WEEKLY');
    expect(screen.getByLabelText('Repeats')).toBeTruthy();
  });
});
