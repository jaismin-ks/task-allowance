// lib/backup.js — the backup file format. Pure (no SQLite, no file system) so it can
// be unit tested; db/operations/backup.js and lib/backupFile.js do the I/O.
//
// A backup is one JSON object:
//   { format, version, exportedAt, appVersion, data: { <table>: [rows] }, photos: { <file name>: <base64 JPEG> } }
// Rows use the SQLite column names. Wishlist photos saved on the phone ("local:" refs,
// see lib/itemPhotos.js) travel inside the file; remote image links stay as links.
// Preferences kept in AsyncStorage (theme, accent, haptics, motion) are not included.
import { isLocalImage } from './format';

export const BACKUP_FORMAT = 'taskallowance-backup';
export const BACKUP_VERSION = 1;

const LOCAL_PREFIX = 'local:';

// Column types per table, in insert order. A trailing "?" means the column may be null
// (and may be missing from the file). Bools are stored as 0/1 like SQLite returns them.
export const BACKUP_TABLES = {
  user_profile: {
    id: 'text',
    display_name: 'text',
    monthly_allowance_cap: 'number',
    daily_task_cap: 'number?',
    currency_code: 'text',
    voice_input_enabled: 'bool',
    created_at: 'text',
    updated_at: 'text',
  },
  task_series: {
    id: 'text',
    title: 'text',
    monetary_value: 'number',
    effort_rating: 'int',
    source: 'text',
    frequency: 'text',
    weekdays: 'text?',
    month_day: 'int?',
    start_date: 'text',
    last_generated_date: 'text?',
    active: 'bool',
    created_at: 'text',
  },
  allowance_pool: {
    id: 'text',
    month_key: 'text',
    monthly_budget_cap: 'number',
    total_earned: 'number',
    total_spent: 'number',
    created_at: 'text',
  },
  wishlist_item: {
    id: 'text',
    product_url: 'text?',
    title: 'text?',
    image_url: 'text?',
    price: 'number?',
    currency: 'text?',
    priority_flag: 'bool',
    scrape_status: 'text',
    purchased_at: 'text?',
    added_at: 'text',
  },
  task: {
    id: 'text',
    title: 'text',
    monetary_value: 'number',
    effort_rating: 'int',
    completion_status: 'text',
    source: 'text',
    task_pack_id: 'text?',
    series_id: 'text?',
    due_date: 'text?',
    completed_at: 'text?',
    timestamp: 'text',
  },
};

// Values the app branches on; anything else would leave rows the UI can't show
const ALLOWED = {
  task: { completion_status: ['pending', 'completed'] },
  task_series: { frequency: ['daily', 'weekly', 'monthly'] },
};

// Photo file names are written into the photos folder, so only plain names are allowed
const SAFE_PHOTO_NAME = /^[A-Za-z0-9_-][A-Za-z0-9._-]{0,99}$/;
const BASE64 = /^[A-Za-z0-9+/]*={0,2}$/;

const isPlainObject = (v) => v != null && typeof v === 'object' && !Array.isArray(v);

// File names of the photos the wishlist rows point at ("local:abc.jpg" → "abc.jpg")
export function localPhotoNames(wishlistRows) {
  const names = wishlistRows.map((r) => r.image_url).filter(isLocalImage).map((v) => v.slice(LOCAL_PREFIX.length));
  return [...new Set(names)];
}

export function backupFileName(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `taskallowance-backup-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.json`;
}

// rows: { <table>: rows as read from SQLite }, photos: { <file name>: base64 }
export function serializeBackup({ rows, photos = {}, exportedAt = new Date(), appVersion = null }) {
  const data = {};
  for (const [table, columns] of Object.entries(BACKUP_TABLES)) {
    data[table] = (rows[table] ?? []).map((row) => {
      const out = {};
      for (const [col, type] of Object.entries(columns)) {
        const value = row[col] ?? null;
        out[col] = type.startsWith('bool') && value != null ? (value ? 1 : 0) : value;
      }
      return out;
    });
  }
  const wanted = new Set(localPhotoNames(data.wishlist_item));
  const keptPhotos = {};
  for (const [name, base64] of Object.entries(photos)) {
    if (wanted.has(name) && typeof base64 === 'string') keptPhotos[name] = base64;
  }
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: exportedAt.toISOString(),
    appVersion,
    data,
    photos: keptPhotos,
  };
}

// Step N upgrades a version-N backup to version N + 1. Add one here whenever the
// schema changes in a way BACKUP_TABLES can't absorb (e.g. a new NOT NULL column).
export const MIGRATIONS = {};

// → { ok: true, backup } | { ok: false, error: 'newer-version' | 'damaged' }
export function migrateBackup(backup, migrations = MIGRATIONS, target = BACKUP_VERSION) {
  let { version } = backup;
  if (!Number.isInteger(version) || version < 1) return { ok: false, error: 'damaged' };
  if (version > target) return { ok: false, error: 'newer-version' };
  let current = backup;
  while (version < target) {
    const step = migrations[version];
    if (!step) return { ok: false, error: 'damaged' };
    current = { ...step(current), version: version + 1 };
    version += 1;
  }
  return { ok: true, backup: current };
}

function checkValue(value, type) {
  const nullable = type.endsWith('?');
  const base = nullable ? type.slice(0, -1) : type;
  if (value == null) return nullable ? { ok: true, value: null } : { ok: false };
  switch (base) {
    case 'text':
      return { ok: typeof value === 'string', value };
    case 'number':
      return { ok: typeof value === 'number' && Number.isFinite(value), value };
    case 'int':
      return { ok: Number.isInteger(value), value };
    case 'bool':
      if (value === true || value === 1) return { ok: true, value: 1 };
      if (value === false || value === 0) return { ok: true, value: 0 };
      return { ok: false };
    default:
      return { ok: false };
  }
}

// Checks a current-version backup row by row and returns a cleaned copy: known
// columns only, bools as 0/1, missing nullable columns as null, and photo refs
// without photo data cleared (the item keeps everything but its picture).
// → { ok: true, backup } | { ok: false, error: 'damaged' }
export function validateBackup(backup) {
  const damaged = { ok: false, error: 'damaged' };
  if (!isPlainObject(backup) || !isPlainObject(backup.data)) return damaged;
  if (typeof backup.exportedAt !== 'string' || Number.isNaN(Date.parse(backup.exportedAt))) return damaged;

  const photosIn = backup.photos == null ? {} : backup.photos;
  if (!isPlainObject(photosIn)) return damaged;
  for (const [name, base64] of Object.entries(photosIn)) {
    if (!SAFE_PHOTO_NAME.test(name) || typeof base64 !== 'string' || !BASE64.test(base64)) return damaged;
  }

  const data = {};
  for (const [table, columns] of Object.entries(BACKUP_TABLES)) {
    const rows = backup.data[table];
    if (!Array.isArray(rows)) return damaged;
    const ids = new Set();
    data[table] = [];
    for (const row of rows) {
      if (!isPlainObject(row)) return damaged;
      const clean = {};
      for (const [col, type] of Object.entries(columns)) {
        const checked = checkValue(row[col], type);
        if (!checked.ok) return damaged;
        clean[col] = checked.value;
      }
      const allowed = ALLOWED[table];
      if (allowed && Object.entries(allowed).some(([col, values]) => !values.includes(clean[col]))) return damaged;
      if (ids.has(clean.id)) return damaged;
      ids.add(clean.id);
      data[table].push(clean);
    }
  }

  // The same rules the database enforces, checked up front so a restore never fails halfway
  if (data.user_profile.length !== 1) return damaged;
  if (data.wishlist_item.filter((r) => r.priority_flag === 1).length > 1) return damaged;
  const months = data.allowance_pool.map((r) => r.month_key);
  if (new Set(months).size !== months.length) return damaged;
  const occurrences = data.task.filter((r) => r.series_id != null).map((r) => `${r.series_id}|${r.due_date}`);
  if (new Set(occurrences).size !== occurrences.length) return damaged;

  const photos = {};
  for (const item of data.wishlist_item) {
    if (!isLocalImage(item.image_url)) continue;
    const name = item.image_url.slice(LOCAL_PREFIX.length);
    if (Object.hasOwn(photosIn, name)) photos[name] = photosIn[name];
    else item.image_url = null;
  }

  return {
    ok: true,
    backup: {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      exportedAt: backup.exportedAt,
      appVersion: typeof backup.appVersion === 'string' ? backup.appVersion : null,
      data,
      photos,
    },
  };
}

// File text → a backup ready to restore.
// → { ok: true, backup } | { ok: false, error: 'not-backup' | 'newer-version' | 'damaged' }
export function parseBackup(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: 'not-backup' };
  }
  if (!isPlainObject(parsed) || parsed.format !== BACKUP_FORMAT) return { ok: false, error: 'not-backup' };
  const migrated = migrateBackup(parsed);
  if (!migrated.ok) return migrated;
  return validateBackup(migrated.backup);
}

// Calm, specific copy for each way a restore can be refused
export const RESTORE_ERRORS = {
  'not-backup': 'That file isn’t a TaskAllowance backup. Nothing on this phone was changed.',
  'newer-version':
    'This backup was made by a newer version of TaskAllowance. Update the app, then try again. Nothing on this phone was changed.',
  damaged: 'This backup looks damaged, so it can’t be restored. Nothing on this phone was changed.',
};

export function summarizeBackup(backup) {
  const { task, wishlist_item: items } = backup.data;
  return {
    exportedAt: new Date(backup.exportedAt),
    tasks: task.length,
    completedTasks: task.filter((t) => t.completion_status === 'completed').length,
    wishlistItems: items.length,
  };
}
