// lib/devChecks.js
// Dev-only integrity checks for the money math. Runs against the real on-device DB
// and cleans up after itself.
import { sqlite } from '../db/client';
import { completeTask, getCurrentMonthKey, uncompleteTask } from '../db/operations/completeTask';

const TEST_VALUE = 1.23;

function readPoolEarned(monthKey) {
  return sqlite.getFirstSync(
    `SELECT total_earned AS totalEarned FROM allowance_pool WHERE month_key = ?`,
    [monthKey]
  )?.totalEarned ?? 0;
}

export function runCompletionIntegrityCheck() {
  const monthKey = getCurrentMonthKey();
  const results = [];
  const testId = `devcheck-${Date.now()}`;

  sqlite.runSync(
    `INSERT INTO task (id, title, monetary_value, effort_rating) VALUES (?, '[dev check]', ?, 1)`,
    [testId, TEST_VALUE]
  );

  try {
    const before = readPoolEarned(monthKey);

    // 1. Completing twice must credit exactly once
    completeTask(testId);
    completeTask(testId);
    const afterDouble = readPoolEarned(monthKey);
    const delta = afterDouble - before;
    results.push({
      name: 'Double completion credits once',
      passed: Math.abs(delta - TEST_VALUE) < 1e-9,
      detail: `expected +${TEST_VALUE}, got +${delta.toFixed(2)}`,
    });

    // 2. Completing a non-existent task is a no-op
    completeTask('does-not-exist');
    const afterMissing = readPoolEarned(monthKey);
    results.push({
      name: 'Unknown task id is a no-op',
      passed: afterMissing === afterDouble,
      detail: `pool changed by ${(afterMissing - afterDouble).toFixed(2)}`,
    });

    // 3. Task row is marked completed with a timestamp
    const row = sqlite.getFirstSync(
      `SELECT completion_status AS status, completed_at AS completedAt FROM task WHERE id = ?`,
      [testId]
    );
    results.push({
      name: 'Task marked completed',
      passed: row?.status === 'completed' && !!row?.completedAt,
      detail: `status=${row?.status}, completed_at=${row?.completedAt}`,
    });

    // 4. Undo debits exactly what was credited and reverts the row; a second undo is a no-op
    uncompleteTask(testId);
    uncompleteTask(testId);
    const afterUndo = readPoolEarned(monthKey);
    const undone = sqlite.getFirstSync(
      `SELECT completion_status AS status FROM task WHERE id = ?`,
      [testId]
    );
    results.push({
      name: 'Undo reverses completion once',
      passed: Math.abs(afterUndo - before) < 1e-9 && undone?.status === 'pending',
      detail: `pool delta ${(afterUndo - before).toFixed(2)}, status=${undone?.status}`,
    });
  } finally {
    // Undo the test credit and remove the test task
    sqlite.withTransactionSync(() => {
      const row = sqlite.getFirstSync(
        `SELECT completion_status AS status FROM task WHERE id = ?`,
        [testId]
      );
      if (row?.status === 'completed') {
        sqlite.runSync(
          `UPDATE allowance_pool SET total_earned = total_earned - ? WHERE month_key = ?`,
          [TEST_VALUE, monthKey]
        );
      }
      sqlite.runSync(`DELETE FROM task WHERE id = ?`, [testId]);
    });
  }

  return results;
}
