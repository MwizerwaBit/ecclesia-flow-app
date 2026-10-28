import { describe, expect, it } from 'vitest';
import { describeMonths, priceForMonths } from './billingService';

const seed = { monthlyCents: 1900, yearlyCents: 19000 };

describe('priceForMonths', () => {
  it('charges the monthly rate for part of a year', () => {
    expect(priceForMonths(seed, 1)).toBe(1900);
    expect(priceForMonths(seed, 3)).toBe(5700);
  });

  it('never charges more than a year for eleven months', () => {
    expect(priceForMonths(seed, 11)).toBe(19000);
  });

  it('uses the yearly price for whole years, and adds the rest monthly', () => {
    expect(priceForMonths(seed, 12)).toBe(19000);
    expect(priceForMonths(seed, 14)).toBe(19000 + 3800);
    expect(priceForMonths(seed, 24)).toBe(38000);
  });

  it('has no price for a plan sold by contact', () => {
    expect(priceForMonths({ monthlyCents: null, yearlyCents: null }, 3)).toBeNull();
  });
});

describe('describeMonths', () => {
  it('reads naturally', () => {
    expect(describeMonths(1)).toBe('1 month');
    expect(describeMonths(12)).toBe('1 year');
    expect(describeMonths(14)).toBe('1 year 2 months');
  });
});
