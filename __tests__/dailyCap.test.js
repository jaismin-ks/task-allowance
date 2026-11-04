import { checkValueAgainstTier, computeDailyCap, getTierMismatch } from '../lib/dailyCap';

// October 2026 has 31 days; the 16th leaves 16 days including today
const OCT_16 = new Date(2026, 9, 16);

describe('computeDailyCap', () => {
  test('spreads the remaining allowance over the remaining days, today included', () => {
    const { dailyCap } = computeDailyCap(150, 0, OCT_16);
    expect(dailyCap).toBeCloseTo(150 / 16);
  });

  test('subtracts what was already earned this month', () => {
    const { dailyCap } = computeDailyCap(150, 70, OCT_16);
    expect(dailyCap).toBeCloseTo(80 / 16);
  });

  test('never drops below the $1 floor, even past the allowance', () => {
    expect(computeDailyCap(150, 150, OCT_16).dailyCap).toBe(1);
    expect(computeDailyCap(150, 400, OCT_16).dailyCap).toBe(1);
  });

  test('on the last day of the month the guide is everything left', () => {
    const { dailyCap } = computeDailyCap(100, 90, new Date(2026, 9, 31));
    expect(dailyCap).toBeCloseTo(10);
  });

  test('handles February in a non-leap year', () => {
    // Feb 2026 has 28 days; the 1st leaves all 28
    const { dailyCap } = computeDailyCap(56, 0, new Date(2026, 1, 1));
    expect(dailyCap).toBeCloseTo(2);
  });

  test('tier ranges are contiguous, rising, and end at the daily guide', () => {
    const { dailyCap, tierRanges } = computeDailyCap(190, 0, new Date(2026, 9, 13)); // 19 days left → $10/day
    expect(tierRanges).toHaveLength(5);
    expect(tierRanges[0][0]).toBe(0);
    for (let i = 1; i < 5; i++) {
      expect(tierRanges[i][0]).toBeCloseTo(tierRanges[i - 1][1]);
      expect(tierRanges[i][1]).toBeGreaterThan(tierRanges[i][0]);
    }
    expect(tierRanges[4][1]).toBeCloseTo(dailyCap);
    // Weights 1:2:3:5:8 → the Tiny tier is 1/19 of the day
    expect(tierRanges[0][1]).toBeCloseTo(10 / 19);
  });
});

describe('soft warning', () => {
  const { tierRanges } = computeDailyCap(190, 0, new Date(2026, 9, 13));

  test('a value inside the effort range is fine', () => {
    const [low, high] = tierRanges[1];
    expect(checkValueAgainstTier((low + high) / 2, 2, tierRanges)).toBe(true);
    expect(getTierMismatch((low + high) / 2, 2, tierRanges)).toBeNull();
  });

  test('flags values above the range as high', () => {
    expect(getTierMismatch(50, 1, tierRanges)).toBe('high');
  });

  test('flags values below the range as low (the UI chooses not to warn)', () => {
    expect(getTierMismatch(0, 5, tierRanges)).toBe('low');
  });

  test('missing ranges never warn', () => {
    expect(checkValueAgainstTier(999, 3, [])).toBe(true);
  });
});
