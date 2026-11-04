import {
  formatReminderTime,
  parseReminderTime,
  planReminders,
  REMINDER_WINDOW_DAYS,
} from '../lib/reminderPlan';

const SEVEN_PM = { hour: 19, minute: 0 };
const NOON_OCT_16 = new Date(2026, 9, 16, 12, 0);
const base = { pendingCount: 3, pendingValue: 4.2, doneToday: false, streak: 0, goalTitle: null, currency: 'USD' };

describe('reminder time', () => {
  test('parses HH:MM', () => {
    expect(parseReminderTime('07:30')).toEqual({ hour: 7, minute: 30 });
    expect(parseReminderTime('9:05')).toEqual({ hour: 9, minute: 5 });
  });

  test.each(['', '24:00', '12:60', 'noon', null, undefined])('%p falls back to 7 PM', (bad) => {
    expect(parseReminderTime(bad)).toEqual(SEVEN_PM);
  });

  test('round-trips', () => {
    expect(formatReminderTime(parseReminderTime('08:05'))).toBe('08:05');
  });
});

describe('planReminders', () => {
  test('schedules today plus the following days at the chosen time', () => {
    const plan = planReminders(SEVEN_PM, base, NOON_OCT_16);
    expect(plan).toHaveLength(REMINDER_WINDOW_DAYS);
    expect(plan[0].date).toEqual(new Date(2026, 9, 16, 19, 0));
    expect(plan[1].date).toEqual(new Date(2026, 9, 17, 19, 0));
    plan.forEach((p) => expect(p.date > NOON_OCT_16).toBe(true));
  });

  test('skips today once the time has passed', () => {
    const plan = planReminders(SEVEN_PM, base, new Date(2026, 9, 16, 20, 0));
    expect(plan[0].date).toEqual(new Date(2026, 9, 17, 19, 0));
    expect(plan).toHaveLength(REMINDER_WINDOW_DAYS - 1);
  });

  test('stays quiet today when everything is done', () => {
    const plan = planReminders(SEVEN_PM, { ...base, pendingCount: 0, pendingValue: 0, doneToday: true }, NOON_OCT_16);
    expect(plan[0].date.getDate()).toBe(17);
  });

  test('today’s copy carries real numbers', () => {
    const [today] = planReminders(SEVEN_PM, { ...base, goalTitle: 'Headphones' }, NOON_OCT_16);
    expect(today).toMatchObject({ title: '3 tasks waiting', body: '$4.20 to earn toward Headphones.' });
  });

  test('a streak at risk leads with the streak', () => {
    const [today] = planReminders(SEVEN_PM, { ...base, streak: 4 }, NOON_OCT_16);
    expect(today.title).toBe('Keep your 4-day streak');
    expect(today.body).toBe('3 tasks waiting · $4.20 to earn.');
  });

  test('after some progress today it counts what’s left', () => {
    const [today] = planReminders(SEVEN_PM, { ...base, pendingCount: 1, pendingValue: 0.5, doneToday: true, streak: 4 }, NOON_OCT_16);
    expect(today).toMatchObject({ title: '1 task left today', body: '$0.50 to earn.' });
  });

  test('an empty list nudges to add a task', () => {
    const [today] = planReminders(SEVEN_PM, { ...base, pendingCount: 0, pendingValue: 0 }, NOON_OCT_16);
    expect(today.title).toBe('Nothing on today’s list');
  });

  test('later days never mention a streak (it would be broken by then)', () => {
    const plan = planReminders(SEVEN_PM, { ...base, streak: 9 }, NOON_OCT_16);
    plan.slice(1).forEach((p) => expect(p.title).not.toMatch(/streak/));
  });

  test('uses the user’s currency', () => {
    const [today] = planReminders(SEVEN_PM, { ...base, currency: 'EUR' }, NOON_OCT_16);
    expect(today.body).toBe('€4.20 to earn.');
  });

  test('crosses month ends', () => {
    const plan = planReminders(SEVEN_PM, base, new Date(2026, 9, 30, 8, 0));
    expect(plan.map((p) => p.date.getDate())).toEqual([30, 31, 1, 2, 3, 4, 5]);
  });
});
