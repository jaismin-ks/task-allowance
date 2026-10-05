// db/operations/completeTask.js
import { sqlite } from '../client';

export function getCurrentMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function completeTask(taskId) {
  const monthKey = getCurrentMonthKey();

  sqlite.withTransactionSync(() => {
    const rows = sqlite.getAllSync(
      `SELECT monetary_value as monetaryValue, completion_status as completionStatus 
       FROM task WHERE id = ?`,
      [taskId]
    );

    const row = rows[0];
    if (!row || row.completionStatus !== 'pending') return; // Idempotency guard

    // 1. Mark task completed
    sqlite.runSync(
      `UPDATE task SET completion_status = 'completed', completed_at = datetime('now') WHERE id = ?`,
      [taskId]
    );

    // 2. Ensure pool row exists for the current month
    sqlite.runSync(
      `INSERT OR IGNORE INTO allowance_pool (month_key, monthly_budget_cap) VALUES (?, 
        COALESCE((SELECT monthly_allowance_cap FROM user_profile LIMIT 1), 150.0))`,
      [monthKey]
    );

    // 3. Increment total earned
    sqlite.runSync(
      `UPDATE allowance_pool SET total_earned = total_earned + ? WHERE month_key = ?`,
      [row.monetaryValue, monthKey]
    );
  });
}

// Generous DB-side bound on the 5s Undo snackbar (it pauses under VoiceOver focus).
// Past this, completions are final — the UI never offers Undo that late anyway.
const UNDO_WINDOW_SECONDS = 120;

// Mirror of completeTask. Debits the month the task was credited to (read from
// completed_at), not "now" — an undo just after midnight on the 1st must hit last month.
export function uncompleteTask(taskId) {
  sqlite.withTransactionSync(() => {
    const row = sqlite.getFirstSync(
      `SELECT monetary_value AS monetaryValue,
              strftime('%Y-%m', completed_at, 'localtime') AS monthKey
       FROM task
       WHERE id = ? AND completion_status = 'completed'
         AND completed_at >= datetime('now', ?)`,
      [taskId, `-${UNDO_WINDOW_SECONDS} seconds`]
    );
    if (!row) return; // Already pending, unknown, or past the undo window

    sqlite.runSync(
      `UPDATE task SET completion_status = 'pending', completed_at = NULL WHERE id = ?`,
      [taskId]
    );
    sqlite.runSync(
      `UPDATE allowance_pool SET total_earned = total_earned - ? WHERE month_key = ?`,
      [row.monetaryValue, row.monthKey]
    );
  });
}