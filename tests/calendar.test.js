import { getCalendarRange } from '../db/operations/calendar';
import { completeTask } from '../db/operations/completeTask';
import { generateDueOccurrences } from '../db/operations/recurring';
import { buildDays, futureRepeats, monthGrid } from '../lib/calendar';
import { dateKey } from '../lib/recurrence';
import { useTaskStore } from '../store/taskStore';
import { resetDb, sqlite } from './sqliteClient';

beforeEach(() => resetDb());

describe('monthGrid', () => {
  test('November 2026: Monday-first, 6 weeks, starts on Oct 26', () => {
    const grid = monthGrid(2026, 10);
    expect(grid).toHaveLength(6);
    expect(grid[0][0].key).toBe('2026-10-26');
    expect(grid[0][6].key).toBe('2026-11-01');
    expect(grid[0][0].inMonth).toBe(false);
    expect(grid[5][6].key).toBe('2026-12-06');
  });
  test('February 2027 fits in 4 weeks when the 1st is a Monday', () => {
    expect(monthGrid(2027, 1)).toHaveLength(4);
  });
});

test('futureRepeats: only after today, from the start date, matching the rule', () => {
  const series = [
    { id: 's1', title: 'Gym', monetaryValue: 3, effortRating: 4, frequency: 'weekly', weekdays: '1,4', active: true, startDate: '2026-11-01' },
    { id: 's2', title: 'Later', monetaryValue: 1, effortRating: 1, frequency: 'daily', weekdays: null, active: true, startDate: '2026-11-20' },
  ];
  const out = futureRepeats(series, '2026-11-01', '2026-11-22', '2026-11-05');
  expect(Object.keys(out).sort()).toEqual(['2026-11-09', '2026-11-12', '2026-11-16', '2026-11-19', '2026-11-20', '2026-11-21', '2026-11-22']);
  expect(out['2026-11-20'].map((r) => r.title)).toEqual(['Later']);
});

test('buildDays against the database: done, planned, undated, missed, earned', () => {
  const today = dateKey();
  const { addTask } = useTaskStore.getState();
  addTask({ title: 'Undated', monetaryValue: 1, effortRating: 1 });
  addTask({ title: 'Planned', monetaryValue: 2, effortRating: 2, dueDate: '2999-01-15' });
  addTask({ title: 'Done', monetaryValue: 2.5, effortRating: 2 });
  completeTask(sqlite.getFirstSync(`SELECT id FROM task WHERE title = 'Done'`).id);

  const days = buildDays(getCalendarRange('2000-01-01', '2999-12-31'), [], '2000-01-01', '2999-12-31', today);
  expect(days[today].done.map((t) => t.title)).toEqual(['Done']);
  expect(days[today].earned).toBe(2.5);
  expect(days[today].todo.map((t) => t.title)).toEqual(['Undated']);
  expect(days['2999-01-15'].todo.map((t) => t.title)).toEqual(['Planned']);
});

test('planned tasks wait off the Today list until their day', () => {
  const { addTask } = useTaskStore.getState();
  addTask({ title: 'Now', monetaryValue: 1, effortRating: 1 });
  addTask({ title: 'Later', monetaryValue: 1, effortRating: 1, dueDate: '2999-01-15' });
  const { pending, upcoming } = useTaskStore.getState();
  expect(pending.map((t) => t.title)).toEqual(['Now']);
  expect(upcoming.map((t) => t.title)).toEqual(['Later']);
});

test('moving a task to another day; repeats keep their own day', () => {
  const { addTask, updateTask } = useTaskStore.getState();
  addTask({ title: 'Move me', monetaryValue: 1, effortRating: 1 });
  const id = sqlite.getFirstSync(`SELECT id FROM task`).id;
  updateTask(id, { title: 'Move me', monetaryValue: 1, effortRating: 1, dueDate: '2999-02-01' });
  expect(sqlite.getFirstSync(`SELECT due_date AS d FROM task WHERE id = ?`, [id]).d).toBe('2999-02-01');
  updateTask(id, { title: 'Move me', monetaryValue: 1, effortRating: 1 }); // undefined: unchanged
  expect(sqlite.getFirstSync(`SELECT due_date AS d FROM task WHERE id = ?`, [id]).d).toBe('2999-02-01');

  const sid = sqlite.getFirstSync(
    `INSERT INTO task_series (title, monetary_value, effort_rating, frequency, start_date) VALUES ('R', 1, 1, 'daily', ?) RETURNING id`,
    [dateKey()]
  ).id;
  generateDueOccurrences();
  const occ = sqlite.getFirstSync(`SELECT id FROM task WHERE series_id = ?`, [sid]).id;
  updateTask(occ, { title: 'R', monetaryValue: 1, effortRating: 1, dueDate: '2999-02-01' });
  expect(sqlite.getFirstSync(`SELECT due_date AS d FROM task WHERE id = ?`, [occ]).d).toBe(dateKey());
});
