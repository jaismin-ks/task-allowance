import { computeStreak, daysToGoal, describeEta, lastNDays, recentDailyPace } from '../lib/stats';

const day = (m, d) => `2026-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const OCT_16 = new Date(2026, 9, 16, 15, 30); // mid-afternoon, like a real "now"

describe('computeStreak', () => {
  test('counts back from today when today has a completion', () => {
    expect(computeStreak([day(10, 14), day(10, 15), day(10, 16)], OCT_16)).toEqual({
      current: 3,
      best: 3,
      doneToday: true,
    });
  });

  test('stays alive until midnight: counts from yesterday if today is empty', () => {
    const s = computeStreak([day(10, 14), day(10, 15)], OCT_16);
    expect(s.current).toBe(2);
    expect(s.doneToday).toBe(false);
  });

  test('a missed day breaks it', () => {
    expect(computeStreak([day(10, 13), day(10, 14)], OCT_16).current).toBe(0);
  });

  test('runs across a month boundary', () => {
    const s = computeStreak([day(9, 29), day(9, 30), day(10, 1)], new Date(2026, 9, 1, 9));
    expect(s.current).toBe(3);
  });

  test('best is the longest run ever, not just the current one', () => {
    const history = [day(10, 1), day(10, 2), day(10, 3), day(10, 4), day(10, 5), day(10, 15), day(10, 16)];
    expect(computeStreak(history, OCT_16)).toMatchObject({ current: 2, best: 5 });
  });

  test('order and duplicates in the input don’t matter', () => {
    expect(computeStreak([day(10, 16), day(10, 14), day(10, 15), day(10, 15)], OCT_16).current).toBe(3);
  });

  test('empty history', () => {
    expect(computeStreak([], OCT_16)).toEqual({ current: 0, best: 0, doneToday: false });
  });
});

describe('recentDailyPace', () => {
  test('needs at least 3 active days before guessing', () => {
    expect(recentDailyPace([{ day: day(10, 15), earned: 5 }, { day: day(10, 16), earned: 5 }], OCT_16)).toBeNull();
  });

  test('averages over the days since the user started, quiet days included', () => {
    // Started Oct 12 (5 days ago incl. today), earned on 3 of them
    const daily = [
      { day: day(10, 12), earned: 4 },
      { day: day(10, 14), earned: 6 },
      { day: day(10, 16), earned: 5 },
    ];
    expect(recentDailyPace(daily, OCT_16)).toBeCloseTo(15 / 5);
  });

  test('caps the window at two weeks', () => {
    const daily = Array.from({ length: 30 }, (_, i) => ({
      day: `2026-${i < 14 ? '10' : '09'}-${String(i < 14 ? 16 - i : 30 - (i - 14)).padStart(2, '0')}`,
      earned: 2,
    }));
    expect(recentDailyPace(daily, OCT_16)).toBeCloseTo(2);
  });

  test('ignores days in the future and outside the window', () => {
    const daily = [
      { day: day(9, 1), earned: 100 },
      { day: day(10, 14), earned: 3 },
      { day: day(10, 15), earned: 3 },
      { day: day(10, 16), earned: 3 },
      { day: day(10, 20), earned: 100 },
    ];
    expect(recentDailyPace(daily, OCT_16)).toBeCloseTo(3);
  });
});

describe('daysToGoal / describeEta', () => {
  test('rounds up to whole days', () => {
    expect(daysToGoal(10, 3)).toBe(4);
  });

  test('already there → 0, no pace → unknown', () => {
    expect(daysToGoal(0, 3)).toBe(0);
    expect(daysToGoal(10, null)).toBeNull();
    expect(daysToGoal(10, 0)).toBeNull();
  });

  test.each([
    [null, null],
    [1, 'about a day'],
    [9, 'about 9 days'],
    [20, 'about 3 weeks'],
    [90, 'about 3 months'],
  ])('%p days → %p', (days, text) => {
    expect(describeEta(days)).toBe(text);
  });
});

describe('lastNDays', () => {
  test('fills quiet days with zero and ends today', () => {
    const week = lastNDays([{ day: day(10, 14), earned: 2.5, count: 2 }], 7, OCT_16);
    expect(week).toHaveLength(7);
    expect(week[0].day).toBe(day(10, 10));
    expect(week[6].day).toBe(day(10, 16));
    expect(week.find((d) => d.day === day(10, 14))).toMatchObject({ earned: 2.5, count: 2 });
    expect(week.filter((d) => d.earned === 0)).toHaveLength(6);
  });
});
