// db/operations/completeTask.js
import { sqlite } from '../client';

export function getCurrentMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

// Returns true when it credited the pool. False means nothing changed: already
// done, deleted, or a missed repeat that was skipped while its row was on screen.
export function completeTask(taskId) {
  const monthKey = getCurrentMonthKey();
  let credited = false;

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

    // 3. Increment total earned. Rounded to cents on every write: REAL sums drift
    // (2.35 + 1.15 + 4.6 + 0.7 + 1.2 = 9.999999999999998), which would leave a
    // $10 goal "not reached" with $0.00 to go.
    sqlite.runSync(
      `UPDATE allowance_pool SET total_earned = ROUND(total_earned + ?, 2) WHERE month_key = ?`,
      [row.monetaryValue, monthKey]
    );
    credited = true;
  });
  return credited;
}

// The Undo snackbar's window, generous because it pauses under VoiceOver focus.
// Kept alongside "completed today" so an Undo tapped just after midnight still works.
const UNDO_WINDOW_SECONDS = 120;

// Mirror of completeTask: "not done" again, and the value comes back off.
// Allowed for anything completed today (the done rows on the Tasks list: tap the
// tick, or swipe → Undo) or in the last couple of minutes. Earlier days are final:
// they're history (Activity, streaks, month wrap-ups).
// Debits the month the task was credited to (read from completed_at), not "now" —
// an undo just after midnight on the 1st must hit last month.
// Returns true when something was undone.
export function uncompleteTask(taskId) {
  let undone = false;
  sqlite.withTransactionSync(() => {
    const row = sqlite.getFirstSync(
      `SELECT monetary_value AS monetaryValue,
              strftime('%Y-%m', completed_at, 'localtime') AS monthKey
       FROM task
       WHERE id = ? AND completion_status = 'completed'
         AND (date(completed_at, 'localtime') = date('now', 'localtime')
              OR completed_at >= datetime('now', ?))`,
      [taskId, `-${UNDO_WINDOW_SECONDS} seconds`]
    );
    if (!row) return; // Already pending, unknown, or from an earlier day

    sqlite.runSync(
      `UPDATE task SET completion_status = 'pending', completed_at = NULL WHERE id = ?`,
      [taskId]
    );
    sqlite.runSync(
      `UPDATE allowance_pool SET total_earned = ROUND(total_earned - ?, 2) WHERE month_key = ?`,
      [row.monetaryValue, row.monthKey]
    );
    undone = true;
  });
  return undone;
}
