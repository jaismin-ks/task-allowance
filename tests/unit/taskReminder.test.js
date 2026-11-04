import {
  defaultReminderDate,
  describeReminder,
  MAX_TASK_REMINDERS,
  parseRemindAt,
  planTaskReminders,
  toRemindAt,
} from '../../lib/taskReminder';

const NOW = new Date(2026, 10, 4, 14, 20); // Wed Nov 4, 2:20 PM

test('remindAt round-trips as local wall-clock time', () => {
  const d = new Date(2026, 10, 4, 18, 5);
  expect(toRemindAt(d)).toBe('2026-11-04T18:05');
  expect(parseRemindAt('2026-11-04T18:05')).toEqual(d);
  expect(parseRemindAt('garbage')).toBeNull();
  expect(parseRemindAt(null)).toBeNull();
});

describe('defaultReminderDate', () => {
  test('next whole hour, at least 30 minutes away', () => {
    expect(defaultReminderDate(NOW)).toEqual(new Date(2026, 10, 4, 15, 0));
    expect(defaultReminderDate(new Date(2026, 10, 4, 14, 45))).toEqual(new Date(2026, 10, 4, 16, 0));
  });
  test('late evening → tomorrow 9 AM', () => {
    expect(defaultReminderDate(new Date(2026, 10, 4, 21, 40))).toEqual(new Date(2026, 10, 5, 9, 0));
    expect(defaultReminderDate(new Date(2026, 10, 30, 23, 50))).toEqual(new Date(2026, 11, 1, 9, 0));
  });
});

test('describeReminder', () => {
  expect(describeReminder(new Date(2026, 10, 4, 18, 0), NOW)).toMatch(/^Today, 6:00\sPM$/);
  expect(describeReminder(new Date(2026, 10, 5, 9, 0), NOW)).toMatch(/^Tomorrow, 9:00\sAM$/);
  expect(describeReminder(new Date(2026, 10, 12, 18, 0), NOW)).toMatch(/^Thu, Nov 12, 6:00\sPM$/);
});

describe('planTaskReminders', () => {
  const task = (id, remindAt, extra = {}) => ({ id, title: `Task ${id}`, monetaryValue: 1.5, remindAt, ...extra });

  test('future reminders only, soonest first', () => {
    const plan = planTaskReminders(
      [task('a', '2026-11-05T09:00'), task('b', '2026-11-04T10:00'), task('c', '2026-11-04T18:00'), task('d', null)],
      'USD',
      NOW
    );
    expect(plan.map((p) => p.id)).toEqual(['c', 'a']);
    expect(plan[0]).toMatchObject({ title: 'Task c', body: 'Worth $1.50.' });
  });

  test('the note’s first line goes in the body', () => {
    const [p] = planTaskReminders([task('a', '2026-11-04T18:00', { notes: 'Use the blue bin\nand rinse' })], 'USD', NOW);
    expect(p.body).toBe('Use the blue bin · worth $1.50');
  });

  test('capped below the iOS limit', () => {
    const many = Array.from({ length: 80 }, (_, i) => task(`t${i}`, `2026-11-${String(5 + (i % 20)).padStart(2, '0')}T09:00`));
    expect(planTaskReminders(many, 'USD', NOW)).toHaveLength(MAX_TASK_REMINDERS);
  });
});
