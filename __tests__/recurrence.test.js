import { addDays, dateKey, describeRule, matchesRule, nextOccurrence, parseDateKey, sameRule } from '../lib/recurrence';

describe('date keys', () => {
  test('are local calendar dates, not UTC', () => {
    expect(dateKey(new Date(2026, 9, 16, 23, 59))).toBe('2026-10-16');
    expect(dateKey(new Date(2026, 0, 1, 0, 1))).toBe('2026-01-01');
  });

  test('round-trip', () => {
    expect(dateKey(parseDateKey('2026-02-28'))).toBe('2026-02-28');
  });

  test('addDays crosses months and years', () => {
    expect(dateKey(addDays(new Date(2026, 11, 31), 1))).toBe('2027-01-01');
    expect(dateKey(addDays(new Date(2026, 2, 1), -1))).toBe('2026-02-28');
  });
});

describe('matchesRule', () => {
  const weekly = { frequency: 'weekly', weekdays: [1, 4], monthDay: 1 }; // Mon + Thu

  test('weekly matches only the picked days', () => {
    expect(matchesRule(weekly, new Date(2026, 9, 12))).toBe(true); // Mon
    expect(matchesRule(weekly, new Date(2026, 9, 15))).toBe(true); // Thu
    expect(matchesRule(weekly, new Date(2026, 9, 16))).toBe(false); // Fri
  });

  test('monthly on the 31st lands on the last day of shorter months', () => {
    const rule = { frequency: 'monthly', weekdays: [], monthDay: 31 };
    expect(matchesRule(rule, new Date(2026, 1, 28))).toBe(true); // Feb 28, 2026
    expect(matchesRule(rule, new Date(2026, 3, 30))).toBe(true); // Apr 30
    expect(matchesRule(rule, new Date(2026, 3, 29))).toBe(false);
    expect(matchesRule(rule, new Date(2026, 9, 31))).toBe(true);
  });

  test('never never matches', () => {
    expect(matchesRule({ frequency: 'never', weekdays: [], monthDay: 1 }, new Date())).toBe(false);
  });
});

describe('nextOccurrence', () => {
  test('is today when today matches', () => {
    const d = nextOccurrence({ frequency: 'daily', weekdays: [], monthDay: 1 }, new Date(2026, 9, 16));
    expect(dateKey(d)).toBe('2026-10-16');
  });

  test('finds the next picked weekday', () => {
    const d = nextOccurrence({ frequency: 'weekly', weekdays: [1], monthDay: 1 }, new Date(2026, 9, 16));
    expect(dateKey(d)).toBe('2026-10-19');
  });

  test('null for a one-off', () => {
    expect(nextOccurrence({ frequency: 'never', weekdays: [], monthDay: 1 })).toBeNull();
  });
});

describe('describeRule', () => {
  test.each([
    [{ frequency: 'daily', weekdays: [], monthDay: 1 }, 'Every day'],
    [{ frequency: 'weekly', weekdays: [1, 2, 3, 4, 5], monthDay: 1 }, 'Every weekday'],
    [{ frequency: 'weekly', weekdays: [0, 6], monthDay: 1 }, 'Every weekend'],
    [{ frequency: 'weekly', weekdays: [4, 1], monthDay: 1 }, 'Every Mon and Thu'],
    [{ frequency: 'monthly', weekdays: [], monthDay: 2 }, 'On the 2nd of each month'],
    [{ frequency: 'monthly', weekdays: [], monthDay: 11 }, 'On the 11th of each month'],
  ])('%p → %p', (rule, text) => {
    expect(describeRule(rule)).toBe(text);
  });

  test('sameRule ignores weekday order', () => {
    expect(
      sameRule({ frequency: 'weekly', weekdays: [4, 1], monthDay: 1 }, { frequency: 'weekly', weekdays: [1, 4], monthDay: 9 })
    ).toBe(true);
  });
});
