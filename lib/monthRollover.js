// lib/monthRollover.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sqlite } from '../db/client';
import { getCurrentMonthKey } from '../db/operations/completeTask';

// Returns the month that just closed (for the G1 wrap-up), or null on first
// launch / same month. The new month's pool row is created lazily here.
export async function checkMonthRollover() {
  const lastKnown = await AsyncStorage.getItem('lastKnownMonthKey');
  const current = getCurrentMonthKey();

  if (lastKnown !== current) {
    sqlite.runSync(
      `INSERT OR IGNORE INTO allowance_pool (month_key, monthly_budget_cap) VALUES (?,
        COALESCE((SELECT monthly_allowance_cap FROM user_profile LIMIT 1), 150.0))`,
      [current]
    );

    await AsyncStorage.setItem('lastKnownMonthKey', current);
    return { rolledOver: true, previousMonthKey: lastKnown, newMonthKey: current };
  }

  return { rolledOver: false };
}

// G1 data for a closed month
export function getMonthSummary(monthKey) {
  const pool = sqlite.getFirstSync(
    `SELECT total_earned AS earned, monthly_budget_cap AS cap FROM allowance_pool WHERE month_key = ?`,
    [monthKey]
  );
  const tasks = sqlite.getFirstSync(
    `SELECT COUNT(*) AS n FROM task WHERE completion_status = 'completed'
       AND strftime('%Y-%m', completed_at, 'localtime') = ?`,
    [monthKey]
  );
  return { earned: pool?.earned ?? 0, cap: pool?.cap ?? null, tasksCompleted: tasks?.n ?? 0 };
}
