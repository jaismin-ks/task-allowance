import { completeTask, getCurrentMonthKey } from '../db/operations/completeTask';
import { generateDueOccurrences, stopSeries, updateSeries } from '../db/operations/recurring';
import { describeRule, matchesRule } from '../lib/recurrence';
import { getTask } from '../store/taskStore';
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

const statuses = (seriesId) =>
  Object.fromEntries(
    sqlite
      .getAllSync(`SELECT due_date AS d, completion_status AS s FROM task WHERE series_id = ?`, [seriesId])
      .map((r) => [r.d, r.s])
  );

const occurrenceId = (seriesId, due) =>
  sqlite.getFirstSync(`SELECT id FROM task WHERE series_id = ? AND due_date = ?`, [seriesId, due]).id;

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

  test('a long absence records at most 31 days, and only the newest is pending', () => {
    const id = addSeries({ frequency: 'daily', startDate: '2026-01-01' });
    generateDueOccurrences(new Date(2026, 9, 31));
    const got = occurrences(id);
    expect(got).toHaveLength(31);
    expect(got[got.length - 1]).toBe('2026-10-31');
    const pending = Object.entries(statuses(id)).filter(([, st]) => st === 'pending');
    expect(pending).toEqual([['2026-10-31', 'pending']]);
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

describe('missed repeats', () => {
  test('missed days collapse: one pending copy, the rest skipped', () => {
    const id = addSeries({ frequency: 'daily', startDate: '2026-10-01' });
    generateDueOccurrences(new Date(2026, 9, 1));
    generateDueOccurrences(new Date(2026, 9, 4));
    expect(statuses(id)).toEqual({
      '2026-10-01': 'skipped',
      '2026-10-02': 'skipped',
      '2026-10-03': 'skipped',
      '2026-10-04': 'pending',
    });
  });

  test('a missed weekly task stays on the list until the next one is due', () => {
    const id = addSeries({ frequency: 'weekly', weekdays: '1', startDate: '2026-10-05' }); // Mondays
    generateDueOccurrences(new Date(2026, 9, 5));
    generateDueOccurrences(new Date(2026, 9, 8)); // Thursday: nothing new due
    expect(statuses(id)).toEqual({ '2026-10-05': 'pending' });
    generateDueOccurrences(new Date(2026, 9, 12)); // next Monday
    expect(statuses(id)).toEqual({ '2026-10-05': 'skipped', '2026-10-12': 'pending' });
  });

  test('a backlog from before this rule collapses on the next load', () => {
    const id = addSeries({ frequency: 'daily', startDate: '2026-10-01' });
    for (const d of ['2026-10-01', '2026-10-02', '2026-10-03']) {
      sqlite.runSync(
        `INSERT INTO task (title, monetary_value, effort_rating, series_id, due_date) VALUES ('Old', 1, 1, ?, ?)`,
        [id, d]
      );
    }
    sqlite.runSync(`UPDATE task_series SET last_generated_date = '2026-10-03' WHERE id = ?`, [id]);
    generateDueOccurrences(new Date(2026, 9, 3));
    expect(statuses(id)).toEqual({ '2026-10-01': 'skipped', '2026-10-02': 'skipped', '2026-10-03': 'pending' });
  });

  test('one-off tasks are never skipped', () => {
    sqlite.runSync(`INSERT INTO task (title, monetary_value, effort_rating) VALUES ('One-off', 1, 1)`);
    addSeries({ frequency: 'daily', startDate: '2026-10-01' });
    generateDueOccurrences(new Date(2026, 9, 5));
    expect(sqlite.getFirstSync(`SELECT completion_status AS s FROM task WHERE title = 'One-off'`).s).toBe('pending');
  });

  test('a skipped occurrence can’t be credited', () => {
    const id = addSeries({ frequency: 'daily', startDate: '2026-10-01' });
    generateDueOccurrences(new Date(2026, 9, 1));
    const stale = occurrenceId(id, '2026-10-01');
    generateDueOccurrences(new Date(2026, 9, 2));
    expect(completeTask(stale)).toBe(false);
    expect(sqlite.getFirstSync(`SELECT COUNT(*) AS n FROM allowance_pool`).n).toBe(0);
    expect(completeTask(occurrenceId(id, '2026-10-02'))).toBe(true);
    expect(
      sqlite.getFirstSync(`SELECT total_earned AS e FROM allowance_pool WHERE month_key = ?`, [getCurrentMonthKey()]).e
    ).toBe(1.5);
  });

  test('missedCount counts skips since the last completed one', () => {
    const id = addSeries({ frequency: 'daily', startDate: '2026-10-01' });
    generateDueOccurrences(new Date(2026, 9, 1));
    completeTask(occurrenceId(id, '2026-10-01'));
    generateDueOccurrences(new Date(2026, 9, 4)); // missed 2nd and 3rd
    expect(getTask(occurrenceId(id, '2026-10-04')).missedCount).toBe(2);
    completeTask(occurrenceId(id, '2026-10-04'));
    generateDueOccurrences(new Date(2026, 9, 5));
    expect(getTask(occurrenceId(id, '2026-10-05')).missedCount).toBe(0);
  });

  test('one-off tasks have no missedCount', () => {
    const t = sqlite.getFirstSync(
      `INSERT INTO task (title, monetary_value, effort_rating) VALUES ('One-off', 1, 1) RETURNING id`
    ).id;
    expect(getTask(t).missedCount).toBe(0);
  });
});

describe('updateSeries', () => {
  test('changes pending future occurrences but never completed (credited) ones', () => {
    const id = addSeries({ frequency: 'daily', startDate: '2026-10-01' });
    generateDueOccurrences(new Date(2026, 9, 1));
    completeTask(occurrenceId(id, '2026-10-01'));
    generateDueOccurrences(new Date(2026, 9, 3)); // 2nd missed → skipped, 3rd pending
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
      { d: '2026-10-01', v: 1.5 }, // completed: already credited, untouched
      { d: '2026-10-02', v: 1.5 }, // skipped: history, untouched
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
