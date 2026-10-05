// db/operations/getProgress.js
import { sqlite } from '../client';

// Available is lifetime earned − lifetime spent, summed across every month's pool row.
// Reading only the current month would drop goal progress to 0% on the 1st.
// Monthly rows still drive the allowance and daily-guide math (getBudgetInfo).
export function getAvailable() {
  const row = sqlite.getFirstSync(
    `SELECT COALESCE(SUM(total_earned), 0) - COALESCE(SUM(total_spent), 0) AS available
     FROM allowance_pool`
  );
  return row?.available ?? 0;
}

// null when no goal is set. A goal with no price still returns, with price null,
// so the Tasks goal card can show "Add a price to track progress".
export function getPriorityItemProgress() {
  const item = sqlite.getFirstSync(
    `SELECT id, title, price, image_url AS imageUrl FROM wishlist_item
     WHERE priority_flag = 1 AND purchased_at IS NULL`
  );
  if (!item) return null;

  const available = getAvailable();
  if (!item.price) {
    return { itemId: item.id, itemTitle: item.title, imageUrl: item.imageUrl, price: null, available };
  }

  return {
    itemId: item.id,
    itemTitle: item.title,
    imageUrl: item.imageUrl,
    price: item.price,
    available,
    percentage: Math.min(100, Math.max(0, (available / item.price) * 100)),
    remaining: Math.max(0, item.price - available),
    reached: available >= item.price,
  };
}
