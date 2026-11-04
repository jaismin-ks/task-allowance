// db/operations/backup.js — read every row for a backup, and replace every row on restore.
// The file format and its checks live in lib/backup.js.
import { BACKUP_TABLES } from '../../lib/backup';
import { sqlite } from '../client';
import { getCurrentMonthKey } from './completeTask';

export function readAllRows() {
  const rows = {};
  for (const [table, columns] of Object.entries(BACKUP_TABLES)) {
    rows[table] = sqlite.getAllSync(`SELECT ${Object.keys(columns).join(', ')} FROM ${table} ORDER BY rowid`);
  }
  return rows;
}

// `backup` must come from parseBackup/validateBackup. All or nothing: if any insert
// fails, the transaction rolls back and the phone keeps its current data.
export function replaceAllData(backup) {
  const tables = Object.entries(BACKUP_TABLES);
  sqlite.withTransactionSync(() => {
    for (const [table] of [...tables].reverse()) sqlite.runSync(`DELETE FROM ${table}`);
    for (const [table, columns] of tables) {
      const names = Object.keys(columns);
      const statement = `INSERT INTO ${table} (${names.join(', ')}) VALUES (${names.map(() => '?').join(', ')})`;
      for (const row of backup.data[table]) {
        sqlite.runSync(statement, names.map((n) => row[n]));
      }
    }
    // An older backup may not have this month yet; same lazy create as the rollover check
    sqlite.runSync(
      `INSERT OR IGNORE INTO allowance_pool (month_key, monthly_budget_cap) VALUES (?,
        COALESCE((SELECT monthly_allowance_cap FROM user_profile LIMIT 1), 150.0))`,
      [getCurrentMonthKey()]
    );
  });
}
