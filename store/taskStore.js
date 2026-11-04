// store/taskStore.js
import { create } from 'zustand';
import { sqlite } from '../db/client';
import { generateDueOccurrences, listActiveSeries } from '../db/operations/recurring';
import { dateKey } from '../lib/recurrence';

// Completing / undoing lives in db/operations/completeTask.js (transaction-safe,
// credits the pool) — never change completion_status from here.

// Occurrences carry their series' frequency (for the "DAILY" caption), due date, and
// missedCount: occurrences skipped in a row before this one, since the last one done
const SELECT = `SELECT task.id, task.title, task.monetary_value AS monetaryValue,
  task.effort_rating AS effortRating, task.completion_status AS completionStatus, task.source,
  task.completed_at AS completedAt, task.timestamp, task.series_id AS seriesId,
  task.due_date AS dueDate, task.notes, task.remind_at AS remindAt, s.frequency, s.active AS seriesActive,
  (SELECT COUNT(*) FROM task m
    WHERE m.series_id = task.series_id AND m.completion_status = 'skipped'
      AND m.due_date < task.due_date
      AND m.due_date > COALESCE((SELECT MAX(c.due_date) FROM task c
                                 WHERE c.series_id = task.series_id AND c.completion_status = 'completed'
                                   AND c.due_date < task.due_date), '')) AS missedCount
  FROM task LEFT JOIN task_series s ON s.id = task.series_id`;

export function getTask(id) {
  return sqlite.getFirstSync(`${SELECT} WHERE task.id = ?`, [id]);
}

export const useTaskStore = create((set, get) => ({
  // Tasks tab view (S1): every pending task for today or earlier (newest first), then
  // today's completed ones. Completed tasks from previous days are hidden.
  // A one-off's due_date is the day it's planned for (null = no particular day,
  // i.e. "today until done"); tasks planned for later wait in `upcoming`.
  pending: [],
  upcoming: [], // pending one-offs planned for a later day, soonest first
  completedToday: [],
  series: [], // active repeating tasks for the "Repeating" section
  loaded: false,
  load: () => {
    // Cheap and idempotent — runs on every load so a new day's repeats appear on
    // focus/foreground, including when the app was left open past midnight
    generateDueOccurrences();
    const today = dateKey();
    const pending = sqlite.getAllSync(
      `${SELECT} WHERE task.completion_status = 'pending'
         AND (task.due_date IS NULL OR task.due_date <= ?)
       ORDER BY task.timestamp DESC, task.rowid DESC`,
      [today]
    );
    const upcoming = sqlite.getAllSync(
      `${SELECT} WHERE task.completion_status = 'pending' AND task.due_date > ?
       ORDER BY task.due_date, task.timestamp`,
      [today]
    );
    const completedToday = sqlite.getAllSync(
      `${SELECT} WHERE task.completion_status = 'completed'
         AND date(task.completed_at, 'localtime') = date('now', 'localtime')
       ORDER BY task.completed_at DESC`
    );
    set({ pending, upcoming, completedToday, series: listActiveSeries(), loaded: true });
  },
  addTask: ({ title, monetaryValue, effortRating, source = 'manual', notes = null, remindAt = null, dueDate = null }) => {
    // Voice double-submission guard: skip an identical voice task from the last minute
    if (source === 'voice') {
      const dupe = sqlite.getFirstSync(
        `SELECT 1 FROM task WHERE title = ? AND source = 'voice'
           AND timestamp >= datetime('now', '-60 seconds')`,
        [title]
      );
      if (dupe) return;
    }
    sqlite.runSync(
      `INSERT INTO task (title, monetary_value, effort_rating, source, notes, remind_at, due_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [title, monetaryValue, effortRating, source, notes || null, remindAt || null, dueDate || null]
    );
    get().load();
  },
  // Pending only — a credited task's value can't change without desyncing the pool
  // `dueDate` (one-offs only — a repeat's day comes from its schedule): pass it to
  // move the task to another day; leave it undefined to keep the day as is
  updateTask: (id, { title, monetaryValue, effortRating, notes = null, remindAt = null, dueDate }) => {
    sqlite.runSync(
      `UPDATE task SET title = ?, monetary_value = ?, effort_rating = ?, notes = ?, remind_at = ?
       WHERE id = ? AND completion_status = 'pending'`,
      [title, monetaryValue, effortRating, notes || null, remindAt || null, id]
    );
    if (dueDate !== undefined) {
      sqlite.runSync(`UPDATE task SET due_date = ? WHERE id = ? AND series_id IS NULL AND completion_status = 'pending'`, [
        dueDate || null,
        id,
      ]);
    }
    get().load();
  },
  // A done task: only its name and note can change — its value is already credited
  updateCompletedTask: (id, { title, notes = null }) => {
    sqlite.runSync(
      `UPDATE task SET title = ?, notes = ? WHERE id = ? AND completion_status = 'completed'`,
      [title, notes || null, id]
    );
    get().load();
  },
  deleteTask: (id) => {
    sqlite.runSync(`DELETE FROM task WHERE id = ? AND completion_status = 'pending'`, [id]);
    get().load();
  },
  // Swipe-to-delete with Undo: returns the deleted row (every column) or null.
  // Pending only, like deleteTask — a credited task can't be removed.
  deleteTaskForUndo: (id) => {
    const row = sqlite.getFirstSync(`SELECT * FROM task WHERE id = ? AND completion_status = 'pending'`, [id]);
    if (!row) return null;
    sqlite.runSync(`DELETE FROM task WHERE id = ?`, [id]);
    get().load();
    return row;
  },
  // Puts a row from deleteTaskForUndo back exactly as it was (same id, timestamp,
  // series + due date). OR IGNORE: if it somehow came back already, do nothing.
  restoreTask: (row) => {
    const cols = Object.keys(row);
    sqlite.runSync(
      `INSERT OR IGNORE INTO task (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
      cols.map((c) => row[c])
    );
    get().load();
  },
}));
