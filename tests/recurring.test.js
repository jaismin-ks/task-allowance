import { completeTask } from '../db/operations/completeTask';
import { generateDueOccurrences, stopSeries, updateSeries } from '../db/operations/recurring';
import { describeRule, matchesRule } from '../lib/recurrence';
import { resetDb, sqlite } from './sqliteClient';

// Inserts a series directly so the start date can be fixed in the past
const addSeries = ({ frequency, weekdays = null, monthDay = null, startDate }) =>
  sqlite.getFirstSync(
    `INSERT INTO task_series (title, monetary_value, effort_rating, frequency, weekdays, month_day, start_date)
     VALUES ('Water plants', 1.5, 1, ?, ?, ?, ?) RETURNING id`,
    [frequency, weekdays, monthDay, startDate]
  ).id;

const occurrences = (seriesId) =>
  sqlite
    .getAllSync(`SELECT due_date AS d FROM task WHERE series_id = ? ORDER BY due_date`, [seriesId])
    .map((r) => r.d);

beforeEach(() => resetDb());

describe('generateDueOccurrences', () => {
  test('daily: one task per day up to today, and idempotent', () => {
    const id = addSeries({ frequency: 'daily', startDate: '2026-10-01' });
    const today = new Date(2026, 9, 3);
    generateDueOccurrences(today);
    generateDueOccurrences(today);
    expect(occurrences(id)).toEqual(['2026-10-01', '2026-10-02', '2026-10-03']);
  });

  test('weekly: only the chosen weekdays', () => {
    const id = addSeries({ frequency: 'weekly', weekdays: '1,4', startDate: '2026-10-01' }); // Mon + Thu
    generateDueOccurrences(new Date(2026, 9, 12));
    expect(occurrences(id)).toEqual(['2026-10-01', '2026-10-05', '2026-10-08', '2026-10-12']);
  });

  test('monthly on the 31st lands on the last day of shorter months', () => {
    const id = addSeries({ frequency: 'monthly', monthDay: 31, startDate: '2026-11-01' });
    generateDueOccurrences(new Date(2026, 11, 1));
    expect(occurrences(id)).toEqual(['2026-11-30']);
  });

  test('a long absence backfills at most 31 days', () => {
    const id = addSeries({ frequency: 'daily', startDate: '2026-01-01' });
    generateDueOccurrences(new Date(2026, 9, 31));
    const got = occurrences(id);
    expect(got).toHaveLength(31);
    expect(got[got.length - 1]).toBe('2026-10-31');
  });

  test('a deleted occurrence never comes back', () => {
    const id = addSeries({ frequency: 'daily', startDate: '2026-10-01' });
    generateDueOccurrences(new Date(2026, 9, 2));
    sqlite.runSync(`DELETE FROM task WHERE series_id = ? AND due_date = '2026-10-01'`, [id]);
    generateDueOccurrences(new Date(2026, 9, 2));
    expect(occurrences(id)).toEqual(['2026-10-02']);
  });

  test('stopped series stop generating', () => {
    const id = addSeries({ frequency: 'daily', startDate: '2026-10-01' });
    generateDueOccurrences(new Date(2026, 9, 1));
    stopSeries(id);
    generateDueOccurrences(new Date(2026, 9, 5));
    expect(occurrences(id)).toEqual(['2026-10-01']);
  });
});

describe('updateSeries', () => {
  test('changes pending future occurrences but never completed (credited) ones', () => {
    const id = addSeries({ frequency: 'daily', startDate: '2026-10-01' });
    generateDueOccurrences(new Date(2026, 9, 3));
    const first = sqlite.getFirstSync(`SELECT id FROM task WHERE due_date = '2026-10-01'`).id;
    completeTask(first);
    updateSeries(
      id,
      { title: 'Water all plants', monetaryValue: 2, effortRating: 2 },
      { frequency: 'daily', weekdays: [], monthDay: 1 },
      { fromKey: '2026-10-02' }
    );
    const rows = sqlite.getAllSync(
      `SELECT due_date AS d, monetary_value AS v FROM task WHERE series_id = ? ORDER BY due_date`,
      [id]
    );
    expect(rows).toEqual([
      { d: '2026-10-01', v: 1.5 },
      { d: '2026-10-02', v: 2 },
      { d: '2026-10-03', v: 2 },
    ]);
  });
});

describe('rule helpers', () => {
  test('describeRule', () => {
    expect(describeRule({ frequency: 'weekly', weekdays: [1, 2, 3, 4, 5] })).toBe('Every weekday');
    expect(describeRule({ frequency: 'weekly', weekdays: [4, 1] })).toBe('Every Mon and Thu');
    expect(describeRule({ frequency: 'monthly', monthDay: 2 })).toBe('On the 2nd of each month');
  });
  test('matchesRule never for one-offs', () => {
    expect(matchesRule({ frequency: 'never' }, new Date())).toBe(false);
  });
});
