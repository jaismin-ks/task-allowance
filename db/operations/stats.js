// db/operations/stats.js
// Read-only queries behind Activity, the streak and the goal ETA. Completed tasks
// can't be deleted or edited, so they're a complete record of what was earned.
import { sqlite } from '../client';

// Earned + task count per local day since `fromKey` ('YYYY-MM-DD'), oldest first
export function getDailyEarnings(fromKey) {
  return sqlite.getAllSync(
    `SELECT date(completed_at, 'localtime') AS day,
            ROUND(SUM(monetary_value), 2) AS earned, COUNT(*) AS count
     FROM task
     WHERE completion_status = 'completed' AND date(completed_at, 'localtime') >= ?
     GROUP BY day ORDER BY day`,
    [fromKey]
  );
}

// Effort points completed per local day since `fromKey` (1:2:3:5:8 by effort),
// for the automatic task value (lib/valueSuggest.js)
export function getDailyEffortPoints(fromKey) {
  return sqlite.getAllSync(
    `SELECT date(completed_at, 'localtime') AS day,
            SUM(CASE effort_rating WHEN 1 THEN 1 WHEN 2 THEN 2 WHEN 3 THEN 3 WHEN 4 THEN 5 ELSE 8 END) AS points
     FROM task
     WHERE completion_status = 'completed' AND date(completed_at, 'localtime') >= ?
     GROUP BY day ORDER BY day`,
    [fromKey]
  );
}

// Every local day with at least one completion (for streaks)
export function getCompletionDays() {
  return sqlite
    .getAllSync(
      `SELECT DISTINCT date(completed_at, 'localtime') AS day FROM task
       WHERE completion_status = 'completed' ORDER BY day`
    )
    .map((r) => r.day);
}

// Lifetime totals. Earned comes from the pool (the source of truth for money).
export function getLifetimeStats() {
  const pool = sqlite.getFirstSync(
    `SELECT ROUND(COALESCE(SUM(total_earned), 0), 2) AS earned, ROUND(COALESCE(SUM(total_spent), 0), 2) AS spent
     FROM allowance_pool`
  );
  const tasks = sqlite.getFirstSync(
    `SELECT COUNT(*) AS n FROM task WHERE completion_status = 'completed'`
  );
  const goals = sqlite.getFirstSync(
    `SELECT COUNT(*) AS n FROM wishlist_item WHERE purchased_at IS NOT NULL`
  );
  return {
    earned: pool?.earned ?? 0,
    spent: pool?.spent ?? 0,
    tasksCompleted: tasks?.n ?? 0,
    goalsReached: goals?.n ?? 0,
  };
}

// Completed tasks, newest first, for the Activity history list
export function getCompletedTasks({ limit = 200 } = {}) {
  return sqlite.getAllSync(
    `SELECT id, title, monetary_value AS monetaryValue, effort_rating AS effortRating,
            source, completed_at AS completedAt, date(completed_at, 'localtime') AS day
     FROM task WHERE completion_status = 'completed'
     ORDER BY completed_at DESC, rowid DESC LIMIT ?`,
    [limit]
  );
}
