// Money integrity: every credit, debit and derived total the app shows.
import { completeTask, getCurrentMonthKey, uncompleteTask } from '../db/operations/completeTask';
import { getBudgetInfo } from '../db/operations/getBudgetInfo';
import { getAvailable, getPriorityItemProgress } from '../db/operations/getProgress';
import { ensureUserProfile, updateMonthlyCap } from '../db/operations/userProfile';
import { redeemGoal, resetAllData } from '../db/operations/wishlist';
import { resetDb, sqlite } from './sqliteClient';

const addTask = (value, title = 'Task') =>
  sqlite.getFirstSync(
    `INSERT INTO task (title, monetary_value, effort_rating) VALUES (?, ?, 2) RETURNING id`,
    [title, value]
  ).id;

const addGoal = (price, title = 'Headphones') =>
  sqlite.getFirstSync(
    `INSERT INTO wishlist_item (title, price, priority_flag, scrape_status)
     VALUES (?, ?, 1, 'failed_manual_entry') RETURNING id`,
    [title, price]
  ).id;

const pool = (monthKey = getCurrentMonthKey()) =>
  sqlite.getFirstSync(
    `SELECT total_earned AS earned, total_spent AS spent, monthly_budget_cap AS cap
     FROM allowance_pool WHERE month_key = ?`,
    [monthKey]
  );

const status = (id) =>
  sqlite.getFirstSync(`SELECT completion_status AS s FROM task WHERE id = ?`, [id]).s;

beforeEach(() => {
  resetDb();
  ensureUserProfile({ monthlyAllowanceCap: 180, currencyCode: 'CAD' });
});

describe('completeTask', () => {
  test('credits the task value to this month and marks it completed', () => {
    const id = addTask(2.5);
    completeTask(id);
    expect(pool().earned).toBe(2.5);
    expect(pool().cap).toBe(180); // new month row takes the profile's allowance
    expect(status(id)).toBe('completed');
  });

  test('completing twice credits once', () => {
    const id = addTask(1.23);
    completeTask(id);
    completeTask(id);
    expect(pool().earned).toBe(1.23);
  });

  test('unknown id is a no-op', () => {
    completeTask('nope');
    expect(pool()).toBeNull();
  });

  test('sums stay exact to the cent (no float drift)', () => {
    for (const v of [2.35, 1.15, 4.6, 0.7, 1.2]) completeTask(addTask(v));
    expect(pool().earned).toBe(10);
    expect(getAvailable()).toBe(10);
  });

  test('a goal is reached when Available equals the price exactly', () => {
    addGoal(10);
    for (const v of [2.35, 1.15, 4.6, 0.7, 1.2]) completeTask(addTask(v));
    const progress = getPriorityItemProgress();
    expect(progress.reached).toBe(true);
    expect(progress.remaining).toBe(0);
    expect(progress.percentage).toBe(100);
  });
});

describe('uncompleteTask (Undo)', () => {
  test('reverses the credit and the status, once', () => {
    const keep = addTask(4);
    const id = addTask(2.5);
    completeTask(keep);
    completeTask(id);
    uncompleteTask(id);
    uncompleteTask(id);
    expect(pool().earned).toBe(4);
    expect(status(id)).toBe('pending');
  });

  test('does nothing after the undo window', () => {
    const id = addTask(3);
    completeTask(id);
    sqlite.runSync(`UPDATE task SET completed_at = datetime('now', '-10 minutes') WHERE id = ?`, [id]);
    uncompleteTask(id);
    expect(pool().earned).toBe(3);
    expect(status(id)).toBe('completed');
  });

  test('is a no-op on a pending task', () => {
    const id = addTask(3);
    uncompleteTask(id);
    expect(pool()).toBeNull();
    expect(status(id)).toBe('pending');
  });
});

describe('Available and goal progress', () => {
  test('Available carries across months (progress never resets on the 1st)', () => {
    sqlite.runSync(
      `INSERT INTO allowance_pool (month_key, monthly_budget_cap, total_earned, total_spent)
       VALUES ('2000-01', 150, 120.5, 20)`
    );
    completeTask(addTask(9.5));
    expect(getAvailable()).toBe(110);
  });

  test('no goal → null; goal without price → price null', () => {
    expect(getPriorityItemProgress()).toBeNull();
    sqlite.runSync(
      `INSERT INTO wishlist_item (title, priority_flag, scrape_status) VALUES ('Bike', 1, 'pending')`
    );
    expect(getPriorityItemProgress()).toMatchObject({ itemTitle: 'Bike', price: null });
  });

  test('progress percentage and remaining', () => {
    addGoal(349);
    completeTask(addTask(124.5));
    expect(getPriorityItemProgress()).toMatchObject({
      available: 124.5,
      remaining: 224.5,
      reached: false,
    });
    expect(getPriorityItemProgress().percentage).toBeCloseTo(35.67, 2);
  });
});

describe('redeemGoal ("I bought it")', () => {
  test('spends the price, clears the goal, and only once', () => {
    const goal = addGoal(10);
    completeTask(addTask(12.75));
    redeemGoal(goal);
    redeemGoal(goal);
    expect(pool().spent).toBe(10);
    expect(getAvailable()).toBe(2.75);
    expect(getPriorityItemProgress()).toBeNull();
    const item = sqlite.getFirstSync(
      `SELECT priority_flag AS flag, purchased_at AS purchasedAt FROM wishlist_item WHERE id = ?`,
      [goal]
    );
    expect(item.flag).toBe(0);
    expect(item.purchasedAt).not.toBeNull();
  });
});

describe('monthly allowance', () => {
  test('changing the cap mid-month never claws back earnings', () => {
    completeTask(addTask(50));
    updateMonthlyCap(20);
    expect(pool()).toMatchObject({ earned: 50, cap: 20 });
    expect(getBudgetInfo()).toMatchObject({ monthlyAllowanceCap: 20, totalEarnedThisMonth: 50 });
  });

  test('resetAllData empties every table', () => {
    addGoal(10);
    completeTask(addTask(5));
    resetAllData();
    for (const table of ['task', 'task_series', 'wishlist_item', 'allowance_pool', 'user_profile']) {
      expect(sqlite.getFirstSync(`SELECT COUNT(*) AS n FROM ${table}`).n).toBe(0);
    }
  });
});
