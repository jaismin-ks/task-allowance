// Backup against a real (in-memory) SQLite with the app's migrations: what
// readAllRows exports, parseBackup accepts, and replaceAllData restores.
import { readAllRows, replaceAllData } from '../db/operations/backup';
import { completeTask, getCurrentMonthKey } from '../db/operations/completeTask';
import { getAvailable, getPriorityItemProgress } from '../db/operations/getProgress';
import { generateDueOccurrences } from '../db/operations/recurring';
import { ensureUserProfile, getProfile } from '../db/operations/userProfile';
import { parseBackup, serializeBackup } from '../lib/backup';
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
  generateDueOccurrences(new Date(2026, 9, 3)); // 1st + 2nd skipped, 3rd pending
  sqlite.runSync(
    `INSERT INTO allowance_pool (month_key, monthly_budget_cap, total_earned) VALUES ('2026-09', 200, 80.25)`
  );
  const id = sqlite.getFirstSync(
    `INSERT INTO task (title, monetary_value, effort_rating) VALUES ('Laundry', 4.5, 3) RETURNING id`
  ).id;
  completeTask(id);
}

const snapshot = () =>
  Object.fromEntries(
    ['user_profile', 'task', 'task_series', 'wishlist_item', 'allowance_pool'].map((t) => [
      t,
      sqlite.getAllSync(`SELECT * FROM ${t} ORDER BY id`),
    ])
  );

// Export the way lib/backupFile.js does, through JSON text, then parse it back
const exportText = (photos = { 'bike.jpg': 'AAAA' }) =>
  JSON.stringify(serializeBackup({ rows: readAllRows(), photos }));

beforeEach(() => resetDb());

test('export → erase → restore gives back identical data, including missed repeats', () => {
  seed();
  const before = snapshot();
  const parsed = parseBackup(exportText());
  expect(parsed.ok).toBe(true);
  resetDb();
  replaceAllData(parsed.backup);
  expect(snapshot()).toEqual(before);
  expect(getProfile()).toMatchObject({ displayName: 'Sam', currencyCode: 'CAD', monthlyAllowanceCap: 220 });
  expect(getAvailable()).toBe(84.75);
  expect(getPriorityItemProgress().itemTitle).toBe('Bike');
  expect(sqlite.getFirstSync(`SELECT COUNT(*) AS n FROM task WHERE completion_status = 'skipped'`).n).toBe(2);
});

test('restore replaces what is on the phone', () => {
  seed();
  const parsed = parseBackup(exportText());
  sqlite.runSync(`INSERT INTO task (title, monetary_value, effort_rating) VALUES ('Extra', 9, 1)`);
  replaceAllData(parsed.backup);
  expect(sqlite.getFirstSync(`SELECT COUNT(*) AS n FROM task WHERE title = 'Extra'`).n).toBe(0);
});

test('a photo missing from the file clears the picture, not the item', () => {
  seed();
  const parsed = parseBackup(exportText({}));
  replaceAllData(parsed.backup);
  expect(sqlite.getFirstSync(`SELECT title, image_url AS img FROM wishlist_item`)).toEqual({ title: 'Bike', img: null });
});

test('an older backup without this month gets this month’s pool row', () => {
  seed();
  const parsed = parseBackup(exportText());
  parsed.backup.data.allowance_pool = parsed.backup.data.allowance_pool.filter(
    (r) => r.month_key !== getCurrentMonthKey()
  );
  replaceAllData(parsed.backup);
  expect(
    sqlite.getFirstSync(`SELECT monthly_budget_cap AS cap FROM allowance_pool WHERE month_key = ?`, [getCurrentMonthKey()])
  ).toEqual({ cap: 220 });
});

test('a failing insert rolls the whole restore back', () => {
  seed();
  const before = snapshot();
  const parsed = parseBackup(exportText());
  parsed.backup.data.task.push({ ...parsed.backup.data.task[0], id: 'x', title: null }); // NOT NULL
  expect(() => replaceAllData(parsed.backup)).toThrow();
  expect(snapshot()).toEqual(before);
});
