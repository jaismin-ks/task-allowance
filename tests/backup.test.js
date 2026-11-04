import { completeTask } from '../db/operations/completeTask';
import { getAvailable, getPriorityItemProgress } from '../db/operations/getProgress';
import { ensureUserProfile, getProfile } from '../db/operations/userProfile';
import { backupFileName, buildBackup, restoreBackup, validateBackup } from '../lib/backup';
import { resetDb, sqlite } from './sqliteClient';

function seed() {
  ensureUserProfile({ monthlyAllowanceCap: 220, currencyCode: 'CAD' });
  sqlite.runSync(`UPDATE user_profile SET display_name = 'Sam'`);
  sqlite.runSync(
    `INSERT INTO wishlist_item (title, price, priority_flag, scrape_status, image_url)
     VALUES ('Bike', 300, 1, 'success', 'local:bike.jpg')`
  );
  sqlite.runSync(
    `INSERT INTO task_series (title, monetary_value, effort_rating, frequency, start_date)
     VALUES ('Dishes', 1, 1, 'daily', '2026-10-01')`
  );
  sqlite.runSync(
    `INSERT INTO allowance_pool (month_key, monthly_budget_cap, total_earned) VALUES ('2026-09', 200, 80.25)`
  );
  const id = sqlite.getFirstSync(
    `INSERT INTO task (title, monetary_value, effort_rating) VALUES ('Laundry', 4.5, 3) RETURNING id`
  ).id;
  completeTask(id);
  sqlite.runSync(`INSERT INTO task (title, monetary_value, effort_rating) VALUES ('Read', 2, 2)`);
}

const snapshot = () =>
  Object.fromEntries(
    ['user_profile', 'task', 'task_series', 'wishlist_item', 'allowance_pool'].map((t) => [
      t,
      sqlite.getAllSync(`SELECT * FROM ${t} ORDER BY id`),
    ])
  );

beforeEach(() => resetDb());

test('export → erase → restore gives back identical data', () => {
  seed();
  const before = snapshot();
  const backup = JSON.parse(JSON.stringify(buildBackup({ photos: { 'bike.jpg': 'AAAA' } })));
  resetDb();
  const summary = restoreBackup(backup);
  expect(snapshot()).toEqual(before);
  expect(summary).toMatchObject({ tasks: 2, completedTasks: 1, wishlistItems: 1, months: 2, photos: 1 });
  expect(getProfile()).toMatchObject({ displayName: 'Sam', currencyCode: 'CAD', monthlyAllowanceCap: 220 });
  expect(getAvailable()).toBe(84.75);
  expect(getPriorityItemProgress().itemTitle).toBe('Bike');
});

test('restore replaces what is on the phone', () => {
  seed();
  const backup = buildBackup();
  sqlite.runSync(`INSERT INTO task (title, monetary_value, effort_rating) VALUES ('Extra', 9, 1)`);
  restoreBackup(backup);
  expect(sqlite.getFirstSync(`SELECT COUNT(*) AS n FROM task WHERE title = 'Extra'`).n).toBe(0);
});

test('a bad row rolls back the whole restore', () => {
  seed();
  const before = snapshot();
  const backup = buildBackup();
  backup.data.task.push({ title: null, monetary_value: 1, effort_rating: 1 }); // NOT NULL violation
  expect(() => restoreBackup(backup)).toThrow();
  expect(snapshot()).toEqual(before);
});

test('unknown columns from a future version are ignored', () => {
  seed();
  const backup = buildBackup();
  backup.data.task[0].mood = 'great';
  expect(() => restoreBackup(backup)).not.toThrow();
});

describe('validateBackup', () => {
  test.each([null, 'text', {}, { format: 'other' }, { format: 'taskallowance-backup', version: 1 }])(
    'rejects %p',
    (value) => expect(validateBackup(value)).toEqual({ ok: false, error: 'That file isn’t a TaskAllowance backup.' })
  );

  test('rejects a backup from a newer app', () => {
    ensureUserProfile();
    const backup = buildBackup();
    expect(validateBackup({ ...backup, version: 99 }).ok).toBe(false);
    expect(validateBackup({ ...backup, schema: '9999_future' }).error).toMatch(/newer version/);
  });

  test('rejects rows that are not objects', () => {
    const backup = buildBackup();
    backup.data.task = [1, 2];
    expect(validateBackup(backup).ok).toBe(false);
  });
});

test('file name uses the local date', () => {
  expect(backupFileName(new Date(2026, 10, 4, 23, 30))).toBe('taskallowance-backup-2026-11-04.json');
});
