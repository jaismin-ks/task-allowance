import {
  DEFAULT_POINTS_PER_DAY,
  isWellAboveSuggestion,
  roundNice,
  suggestTaskValue,
  usualPointsPerDay,
} from '../../lib/valueSuggest';
import { computeDailyCap } from '../../lib/dailyCap';

const NOV_15 = new Date(2026, 10, 15, 12);
const day = (d) => `2026-11-${String(d).padStart(2, '0')}`;

describe('suggestTaskValue', () => {
  test('a usual day of tasks earns exactly the daily guide (before rounding)', () => {
    // 10 points/day: Tiny + Quick + Steady + Hard = 1 + 2 + 3 + 5 = 11 points ≈ guide
    const dailyGuide = 6;
    const perPoint = dailyGuide / DEFAULT_POINTS_PER_DAY;
    expect(suggestTaskValue({ dailyGuide, effort: 2 })).toBe(roundNice(perPoint * 2));
    expect(suggestTaskValue({ dailyGuide, effort: 5 })).toBe(roundNice(perPoint * 8));
  });

  test('harder tasks are always worth at least as much', () => {
    const values = [1, 2, 3, 4, 5].map((effort) => suggestTaskValue({ dailyGuide: 6.67, pointsPerDay: 10, effort }));
    for (let i = 1; i < values.length; i += 1) expect(values[i]).toBeGreaterThanOrEqual(values[i - 1]);
  });

  test('$180 allowance, nothing earned, Nov 4: sensible amounts', () => {
    const { dailyCap } = computeDailyCap(180, 0, new Date(2026, 10, 4));
    const v = (effort) => suggestTaskValue({ dailyGuide: dailyCap, pointsPerDay: 10, effort });
    expect([v(1), v(2), v(3), v(4), v(5)]).toEqual([0.65, 1.25, 2, 3.25, 5.25]);
  });

  test('doing more tasks per day makes each one worth less, so the month still totals the allowance', () => {
    const light = suggestTaskValue({ dailyGuide: 6, pointsPerDay: 5, effort: 3 });
    const busy = suggestTaskValue({ dailyGuide: 6, pointsPerDay: 20, effort: 3 });
    expect(light).toBeGreaterThan(busy);
  });

  test('never zero', () => {
    expect(suggestTaskValue({ dailyGuide: 0, effort: 1 })).toBe(0.05);
  });
});

describe('roundNice', () => {
  test.each([
    [0.33, 0.35],
    [0.02, 0.05],
    [1.33, 1.25],
    [3.4, 3.5],
    [12.2, 12],
    [12.3, 12.5],
  ])('%p → %p', (input, expected) => expect(roundNice(input)).toBe(expected));
});

describe('usualPointsPerDay', () => {
  test('default until there are 3 active days', () => {
    expect(usualPointsPerDay([{ day: day(13), points: 20 }, { day: day(14), points: 20 }], NOV_15)).toBe(
      DEFAULT_POINTS_PER_DAY
    );
  });

  test('averages over the days since you started, quiet days count as zero, today ignored', () => {
    const rows = [
      { day: day(11), points: 12 }, // started 4 days ago
      { day: day(12), points: 0 },
      { day: day(13), points: 6 },
      { day: day(14), points: 6 },
      { day: day(15), points: 99 }, // today — ignored
    ];
    expect(usualPointsPerDay(rows, NOV_15)).toBe(6); // 24 points / 4 days
  });

  test('clamped so one odd fortnight can’t swing prices wildly', () => {
    const rows = [11, 12, 13, 14].map((d) => ({ day: day(d), points: 200 }));
    expect(usualPointsPerDay(rows, NOV_15)).toBe(40);
  });
});

test('soft warning only well above the suggestion', () => {
  expect(isWellAboveSuggestion(2, 1.5)).toBe(false);
  expect(isWellAboveSuggestion(3.01, 1.5)).toBe(true);
});
