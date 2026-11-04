// db/operations/wishlist.js
import { sqlite } from '../client';
import { getCurrentMonthKey } from './completeTask';

// "I bought it": mark purchased, clear the goal, and spend the price from this
// month's pool — one transaction so Available can never double-count the item.
export function redeemGoal(itemId) {
  const monthKey = getCurrentMonthKey();

  sqlite.withTransactionSync(() => {
    const item = sqlite.getFirstSync(
      `SELECT price FROM wishlist_item WHERE id = ? AND purchased_at IS NULL`,
      [itemId]
    );
    if (!item) return; // Already redeemed — idempotency guard

    sqlite.runSync(
      `UPDATE wishlist_item SET purchased_at = datetime('now'), priority_flag = 0 WHERE id = ?`,
      [itemId]
    );
    sqlite.runSync(
      `INSERT OR IGNORE INTO allowance_pool (month_key, monthly_budget_cap) VALUES (?,
        COALESCE((SELECT monthly_allowance_cap FROM user_profile LIMIT 1), 150.0))`,
      [monthKey]
    );
    sqlite.runSync(
      `UPDATE allowance_pool SET total_spent = ROUND(total_spent + ?, 2) WHERE month_key = ?`,
      [item.price ?? 0, monthKey]
    );
  });
}

// Settings → "Erase everything". Keeps the schema; ensureUserProfile re-creates defaults.
export function resetAllData() {
  sqlite.withTransactionSync(() => {
    sqlite.runSync(`DELETE FROM task`);
    sqlite.runSync(`DELETE FROM task_series`);
    sqlite.runSync(`DELETE FROM wishlist_item`);
    sqlite.runSync(`DELETE FROM allowance_pool`);
    sqlite.runSync(`DELETE FROM user_profile`);
  });
}
