// db/operations/getBudgetInfo.js
import { sqlite } from '../client';
import { getCurrentMonthKey } from './completeTask';

export function getBudgetInfo() {
  const monthKey = getCurrentMonthKey();

  const user = sqlite.getAllSync(
    `SELECT monthly_allowance_cap as monthlyCap, currency_code as currencyCode FROM user_profile LIMIT 1`
  )[0];

  const pool = sqlite.getAllSync(
    `SELECT ROUND(total_earned, 2) as totalEarned FROM allowance_pool WHERE month_key = ?`,
    [monthKey]
  )[0];

  return {
    monthlyAllowanceCap: user?.monthlyCap ?? 150.0,
    totalEarnedThisMonth: pool?.totalEarned ?? 0.0,
    currencyCode: user?.currencyCode ?? 'USD',
  };
}