// store/taskStore.js
import { create } from 'zustand';
import { sqlite } from '../db/client';
import { generateDueOccurrences, listActiveSeries } from '../db/operations/recurring';

// Completing / undoing lives in db/operations/completeTask.js (transaction-safe,
// credits the pool) — never change completion_status from here.

// Occurrences carry their series' frequency (for the "DAILY" caption), due date, and
// missedCount: occurrences skipped in a row before this one, since the last one done
const SELECT = `SELECT task.id, task.title, task.monetary_value AS monetaryValue,
  task.effort_rating AS effortRating, task.completion_status AS completionStatus, task.source,
  task.completed_at AS completedAt, task.timestamp, task.series_id AS seriesId,
  task.due_date AS dueDate, s.frequency, s.active AS seriesActive,
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
  // Tasks tab view (S1): every pending task (newest first), then today's completed ones.
  // Completed tasks from previous days are hidden.
  pending: [],
  completedToday: [],
  series: [], // active repeating tasks for the "Repeating" section
  loaded: false,
  load: () => {
    // Cheap and idempotent — runs on every load so a new day's repeats appear on
    // focus/foreground, including when the app was left open past midnight
    generateDueOccurrences();
    const pending = sqlite.getAllSync(
      `${SELECT} WHERE task.completion_status = 'pending' ORDER BY task.timestamp DESC, task.rowid DESC`
    );
    const completedToday = sqlite.getAllSync(
      `${SELECT} WHERE task.completion_status = 'completed'
         AND date(task.completed_at, 'localtime') = date('now', 'localtime')
       ORDER BY task.completed_at DESC`
    );
    set({ pending, completedToday, series: listActiveSeries(), loaded: true });
  },
  addTask: ({ title, monetaryValue, effortRating, source = 'manual' }) => {
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
      `INSERT INTO task (title, monetary_value, effort_rating, source) VALUES (?, ?, ?, ?)`,
      [title, monetaryValue, effortRating, source]
    );
    get().load();
  },
  // Pending only — a credited task's value can't change without desyncing the pool
  updateTask: (id, { title, monetaryValue, effortRating }) => {
    sqlite.runSync(
      `UPDATE task SET title = ?, monetary_value = ?, effort_rating = ?
       WHERE id = ? AND completion_status = 'pending'`,
      [title, monetaryValue, effortRating, id]
    );
    get().load();
  },
  deleteTask: (id) => {
    sqlite.runSync(`DELETE FROM task WHERE id = ? AND completion_status = 'pending'`, [id]);
    get().load();
  },
}));
