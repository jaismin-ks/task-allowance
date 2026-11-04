// Swipe-to-delete with Undo, against real SQLite
import { completeTask } from '../db/operations/completeTask';
import { generateDueOccurrences } from '../db/operations/recurring';
import { dateKey } from '../lib/recurrence';
import { useTaskStore } from '../store/taskStore';
import { resetDb, sqlite } from './sqliteClient';

const row = (id) => sqlite.getFirstSync(`SELECT * FROM task WHERE id = ?`, [id]);
const { deleteTaskForUndo, restoreTask } = useTaskStore.getState();

beforeEach(() => resetDb());

test('delete then undo restores the row exactly', () => {
  const id = sqlite.getFirstSync(
    `INSERT INTO task (title, monetary_value, effort_rating, source) VALUES ('Fold laundry', 2.5, 3, 'voice') RETURNING id`
  ).id;
  const before = row(id);
  expect(deleteTaskForUndo(id)).toEqual(before);
  expect(row(id)).toBeNull();
  restoreTask(before);
  expect(row(id)).toEqual(before);
});

// Starts today: the store reloads (and generates up to the real today) on every change
test('a repeating occurrence comes back with its series and due date', () => {
  const seriesId = sqlite.getFirstSync(
    `INSERT INTO task_series (title, monetary_value, effort_rating, frequency, start_date)
     VALUES ('Dishes', 1, 1, 'daily', ?) RETURNING id`,
    [dateKey()]
  ).id;
  generateDueOccurrences();
  const id = sqlite.getFirstSync(`SELECT id FROM task WHERE series_id = ?`, [seriesId]).id;
  const before = row(id);
  restoreTask(deleteTaskForUndo(id));
  expect(row(id)).toEqual(before);
  // And generation stays idempotent afterwards
  generateDueOccurrences();
  expect(sqlite.getFirstSync(`SELECT COUNT(*) AS n FROM task WHERE series_id = ?`, [seriesId]).n).toBe(1);
});

test('completed tasks can’t be deleted', () => {
  const id = sqlite.getFirstSync(
    `INSERT INTO task (title, monetary_value, effort_rating) VALUES ('Done', 1, 1) RETURNING id`
  ).id;
  completeTask(id);
  expect(deleteTaskForUndo(id)).toBeNull();
  expect(row(id).completion_status).toBe('completed');
});

test('restoring twice is harmless', () => {
  const id = sqlite.getFirstSync(
    `INSERT INTO task (title, monetary_value, effort_rating) VALUES ('Read', 1, 1) RETURNING id`
  ).id;
  const saved = deleteTaskForUndo(id);
  restoreTask(saved);
  restoreTask(saved);
  expect(sqlite.getFirstSync(`SELECT COUNT(*) AS n FROM task`).n).toBe(1);
});
