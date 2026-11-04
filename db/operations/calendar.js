// db/operations/calendar.js — everything the Calendar shows for a date range
import { sqlite } from '../client';

const COLS = `id, title, monetary_value AS monetaryValue, effort_rating AS effortRating,
  series_id AS seriesId, due_date AS dueDate, notes, remind_at AS remindAt`;

// fromKey / toKey: local 'YYYY-MM-DD', inclusive
export function getCalendarRange(fromKey, toKey) {
  const done = sqlite.getAllSync(
    `SELECT ${COLS}, date(completed_at, 'localtime') AS day FROM task
     WHERE completion_status = 'completed' AND date(completed_at, 'localtime') BETWEEN ? AND ?
     ORDER BY completed_at`,
    [fromKey, toKey]
  );
  // All pending: undated and overdue ones are placed on today by lib/calendar.js
  const todo = sqlite.getAllSync(
    `SELECT ${COLS} FROM task WHERE completion_status = 'pending' ORDER BY due_date, timestamp`
  );
  const missed = sqlite.getAllSync(
    `SELECT ${COLS} FROM task
     WHERE completion_status = 'skipped' AND due_date BETWEEN ? AND ? ORDER BY due_date`,
    [fromKey, toKey]
  );
  return { done, todo, missed };
}
