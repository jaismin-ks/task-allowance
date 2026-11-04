import { computeDailyCap, getTierMismatch } from '../lib/dailyCap';

describe('computeDailyCap (Daily guide)', () => {
  test('spreads the remaining budget over the remaining days, today included', () => {
    // Oct 2026 has 31 days; on the 22nd there are 10 days left
    const { dailyCap } = computeDailyCap(180, 80, new Date(2026, 9, 22));
    expect(dailyCap).toBeCloseTo(10, 10);
  });

  test('never drops below the $1 floor, even when over the allowance', () => {
    expect(computeDailyCap(150, 400, new Date(2026, 9, 5)).dailyCap).toBe(1);
  });

  test('last day of the month gets everything that is left', () => {
    expect(computeDailyCap(100, 60, new Date(2026, 1, 28)).dailyCap).toBe(40);
  });

  test('effort ranges are contiguous and split 1:2:3:5:8', () => {
    const { dailyCap, tierRanges } = computeDailyCap(190, 0, new Date(2026, 9, 1)); // 190/31
    expect(tierRanges).toHaveLength(5);
    expect(tierRanges[0][0]).toBe(0);
    for (let i = 1; i < 5; i += 1) expect(tierRanges[i][0]).toBeCloseTo(tierRanges[i - 1][1], 10);
    expect(tierRanges[4][1]).toBeCloseTo(dailyCap, 10);
    const unit = dailyCap / 19;
    expect(tierRanges[3][1] - tierRanges[3][0]).toBeCloseTo(unit * 5, 10);
  });
});

describe('getTierMismatch (soft warning)', () => {
  const { tierRanges } = computeDailyCap(19 * 31, 0, new Date(2026, 9, 1)); // dailyCap 19 → unit $1
  test('inside the range → null', () => expect(getTierMismatch(2, 2, tierRanges)).toBeNull());
  test('above → high', () => expect(getTierMismatch(6, 2, tierRanges)).toBe('high'));
  test('below → low', () => expect(getTierMismatch(0.5, 2, tierRanges)).toBe('low'));
  test('no ranges yet → null', () => expect(getTierMismatch(99, 2, [])).toBeNull());
});
