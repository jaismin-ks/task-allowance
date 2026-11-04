import { buildReminderPlan, displayTime, parseTime, REMINDER_DAYS } from '../lib/reminderPlan';

const goal = { itemTitle: 'Headphones', price: 349, percentage: 64.9, reached: false };
const base = { time: '18:00', pendingCount: 3, pendingValue: 4.2, progress: goal, currency: 'USD' };

describe('buildReminderPlan', () => {
  test('today quotes live numbers, later days get a general nudge', () => {
    const plan = buildReminderPlan({ ...base, now: new Date(2026, 10, 4, 9, 0) });
    expect(plan).toHaveLength(REMINDER_DAYS);
    expect(plan[0]).toEqual({
      date: new Date(2026, 10, 4, 18, 0),
      title: '3 tasks left today',
      body: '$4.20 still to earn. You’re 64% of the way to Headphones.',
    });
    expect(plan[1]).toEqual({
      date: new Date(2026, 10, 5, 18, 0),
      title: 'Time for a task or two',
      body: 'You’re 64% of the way to Headphones.',
    });
  });

  test('no reminder today once everything is done', () => {
    const plan = buildReminderPlan({ ...base, pendingCount: 0, now: new Date(2026, 10, 4, 9, 0) });
    expect(plan).toHaveLength(REMINDER_DAYS - 1);
    expect(plan[0].date).toEqual(new Date(2026, 10, 5, 18, 0));
  });

  test('skips today when the time has passed', () => {
    const plan = buildReminderPlan({ ...base, now: new Date(2026, 10, 4, 18, 0) });
    expect(plan[0].date).toEqual(new Date(2026, 10, 5, 18, 0));
  });

  test('singular task, no goal, no value', () => {
    const plan = buildReminderPlan({
      ...base, pendingCount: 1, pendingValue: 0, progress: null, now: new Date(2026, 10, 4, 9, 0),
    });
    expect(plan[0]).toMatchObject({ title: '1 task left today', body: 'Tick one off when you’re ready.' });
    expect(plan[1].body).toBe('Every task you finish adds to what you’ve earned.');
  });

  test('goal reached', () => {
    const plan = buildReminderPlan({ ...base, progress: { ...goal, reached: true }, now: new Date(2026, 10, 4, 9) });
    expect(plan[1].body).toBe('You’ve earned enough for Headphones.');
  });

  test('crosses month ends', () => {
    const plan = buildReminderPlan({ ...base, now: new Date(2026, 10, 30, 20, 0) });
    expect(plan[0].date).toEqual(new Date(2026, 11, 1, 18, 0));
  });
});

describe('time helpers', () => {
  test('parseTime', () => {
    expect(parseTime('07:30')).toEqual({ hours: 7, minutes: 30 });
    expect(parseTime('25:00')).toEqual({ hours: 18, minutes: 0 });
    expect(parseTime(null)).toEqual({ hours: 18, minutes: 0 });
  });
  test('displayTime', () => expect(displayTime('18:00')).toBe('6:00 PM'));
});
