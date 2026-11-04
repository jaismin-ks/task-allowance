// lib/backup.js
// Backup format + restore. Everything lives on the phone, so this file is the
// user's only copy outside it: deleting the app, or a new phone without a device
// backup, otherwise loses every task, wishlist item and month of earnings.
//
// Pure data + SQLite only (no file system), so it runs under the Jest SQLite shim.
// File, share sheet and photo handling live in lib/backupFiles.js.
import { sqlite } from '../db/client';
import journal from '../db/migrations/meta/_journal.json';

export const BACKUP_FORMAT = 'taskallowance-backup';
export const BACKUP_VERSION = 1;

// Insert order on restore. Nothing uses REFERENCES today, but parents go first anyway.
export const BACKUP_TABLES = ['user_profile', 'task_series', 'allowance_pool', 'wishlist_item', 'task'];

const MIGRATION_TAGS = journal.entries.map((e) => e.tag);
const LATEST_MIGRATION = MIGRATION_TAGS[MIGRATION_TAGS.length - 1];

const columnsOf = (table) => sqlite.getAllSync(`PRAGMA table_info(${table})`).map((c) => c.name);

// Plain JSON object of every table. `photos` maps "local:" photo names → base64 JPEG.
export function buildBackup({ photos = {}, prefs = {}, now = new Date() } = {}) {
  const data = {};
  for (const table of BACKUP_TABLES) {
    data[table] = sqlite.getAllSync(`SELECT * FROM ${table}`);
  }
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    schema: LATEST_MIGRATION,
    exportedAt: now.toISOString(),
    data,
    prefs,
    photos,
  };
}

// → { ok: true, summary } | { ok: false, error } — error is user-facing copy
export function validateBackup(backup) {
  const notOurs = { ok: false, error: 'That file isn’t a TaskAllowance backup.' };
  if (!backup || typeof backup !== 'object' || backup.format !== BACKUP_FORMAT) return notOurs;
  if (typeof backup.version !== 'number' || backup.version > BACKUP_VERSION) {
    return { ok: false, error: 'This backup is from a newer version of TaskAllowance. Update the app, then try again.' };
  }
  if (backup.schema && !MIGRATION_TAGS.includes(backup.schema)) {
    return { ok: false, error: 'This backup is from a newer version of TaskAllowance. Update the app, then try again.' };
  }
  const data = backup.data;
  if (!data || typeof data !== 'object') return notOurs;
  for (const table of BACKUP_TABLES) {
    const rows = data[table] ?? [];
    if (!Array.isArray(rows) || rows.some((r) => !r || typeof r !== 'object' || Array.isArray(r))) {
      return notOurs;
    }
  }
  if ((data.user_profile ?? []).length > 1) return notOurs;

  const tasks = data.task ?? [];
  return {
    ok: true,
    summary: {
      exportedAt: backup.exportedAt ?? null,
      tasks: tasks.length,
      completedTasks: tasks.filter((t) => t.completion_status === 'completed').length,
      wishlistItems: (data.wishlist_item ?? []).length,
      months: (data.allowance_pool ?? []).length,
      photos: Object.keys(backup.photos ?? {}).length,
    },
  };
}

// Replaces everything in the database with the backup, in one transaction: a bad
// row rolls the whole restore back and the phone's current data stays as it was.
// Unknown columns (from a future version) are dropped; missing ones take defaults.
export function restoreBackup(backup) {
  const check = validateBackup(backup);
  if (!check.ok) throw new Error(check.error);

  sqlite.withTransactionSync(() => {
    for (const table of [...BACKUP_TABLES].reverse()) sqlite.runSync(`DELETE FROM ${table}`);

    for (const table of BACKUP_TABLES) {
      const known = new Set(columnsOf(table));
      for (const row of backup.data[table] ?? []) {
        const cols = Object.keys(row).filter((c) => known.has(c));
        if (!cols.length) continue;
        const values = cols.map((c) => {
          const v = row[c];
          return v === undefined || (typeof v === 'object' && v !== null) ? null : v;
        });
        sqlite.runSync(
          `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
          values
        );
      }
    }
  });
  return check.summary;
}

// "taskallowance-backup-2026-11-04.json"
export function backupFileName(now = new Date()) {
  const d = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return `taskallowance-backup-${d}.json`;
}
