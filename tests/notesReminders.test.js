// Notes and reminders on tasks and repeating tasks, against real SQLite
import { createSeries, generateDueOccurrences, updateSeries } from '../db/operations/recurring';
import { dateKey } from '../lib/recurrence';
import { getTask, useTaskStore } from '../store/taskStore';
import { resetDb, sqlite } from './sqliteClient';

beforeEach(() => resetDb());

test('a one-off task keeps its note and reminder, and edits can clear them', () => {
  const { addTask, updateTask } = useTaskStore.getState();
  addTask({ title: 'Recycling', monetaryValue: 1, effortRating: 1, notes: 'Blue bin', remindAt: '2026-11-04T18:00' });
  const id = sqlite.getFirstSync(`SELECT id FROM task`).id;
  expect(getTask(id)).toMatchObject({ notes: 'Blue bin', remindAt: '2026-11-04T18:00' });
  updateTask(id, { title: 'Recycling', monetaryValue: 1, effortRating: 1 });
  expect(getTask(id)).toMatchObject({ notes: null, remindAt: null });
});

test('a repeating task puts its note and reminder time on each pending occurrence', () => {
  const today = dateKey();
  const id = createSeries(
    { title: 'Water plants', monetaryValue: 0.5, effortRating: 1, notes: 'Not the cactus', remindTime: '08:30' },
    { frequency: 'daily', weekdays: [], monthDay: 1 }
  );
  const occ = sqlite.getFirstSync(`SELECT id FROM task WHERE series_id = ?`, [id]).id;
  expect(getTask(occ)).toMatchObject({ notes: 'Not the cactus', remindAt: `${today}T08:30`, dueDate: today });

  updateSeries(
    id,
    { title: 'Water plants', monetaryValue: 0.5, effortRating: 1, notes: null, remindTime: '19:00' },
    { frequency: 'daily', weekdays: [], monthDay: 1 }
  );
  expect(getTask(occ)).toMatchObject({ notes: null, remindAt: `${today}T19:00` });
});

test('missed (skipped) occurrences never carry a reminder', () => {
  const id = sqlite.getFirstSync(
    `INSERT INTO task_series (title, monetary_value, effort_rating, frequency, start_date, remind_time)
     VALUES ('Stretch', 1, 1, 'daily', '2026-10-01', '07:00') RETURNING id`
  ).id;
  generateDueOccurrences(new Date(2026, 9, 3));
  const rows = sqlite.getAllSync(
    `SELECT due_date AS d, completion_status AS s, remind_at AS r FROM task WHERE series_id = ? ORDER BY due_date`,
    [id]
  );
  expect(rows).toEqual([
    { d: '2026-10-01', s: 'skipped', r: null },
    { d: '2026-10-02', s: 'skipped', r: null },
    { d: '2026-10-03', s: 'pending', r: '2026-10-03T07:00' },
  ]);
});

test('a done task can be renamed and made repeating without a duplicate today', () => {
  const { addTask, updateCompletedTask } = useTaskStore.getState();
  addTask({ title: 'Gym', monetaryValue: 3, effortRating: 4 });
  const id = sqlite.getFirstSync(`SELECT id FROM task`).id;
  sqlite.runSync(`UPDATE task SET completion_status = 'completed', completed_at = datetime('now') WHERE id = ?`, [id]);

  updateCompletedTask(id, { title: 'Gym session', notes: 'Legs' });
  expect(getTask(id)).toMatchObject({ title: 'Gym session', notes: 'Legs', monetaryValue: 3 });

  const seriesId = createSeries(
    { title: 'Gym session', monetaryValue: 3, effortRating: 4, notes: 'Legs' },
    { frequency: 'daily', weekdays: [], monthDay: 1 },
    { attachTaskId: id }
  );
  const today = sqlite.getAllSync(`SELECT id, completion_status AS s FROM task WHERE series_id = ?`, [seriesId]);
  expect(today).toEqual([{ id, s: 'completed' }]); // the done task is today's copy
});
