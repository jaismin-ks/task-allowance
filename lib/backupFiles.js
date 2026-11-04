// lib/backupFiles.js
// The device side of backups: write the JSON to a file and hand it to the share
// sheet (Files, iCloud Drive, Google Drive, email…), pick a file to restore, and
// carry wishlist photos along as base64. Data format + restore: lib/backup.js.
import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { sqlite } from '../db/client';
import { ACCENTS } from '../theme/palettes';
import { backupFileName, buildBackup, restoreBackup, validateBackup } from './backup';
import { deleteAllItemPhotos } from './itemPhotos';
import { flags, usePrefs } from './prefs';

const PHOTO_DIR = 'wishlist-photos'; // same folder lib/itemPhotos.js uses
const SAFE_PHOTO_NAME = /^[\w.-]{1,100}\.jpg$/;

async function collectPhotos() {
  const photos = {};
  const names = sqlite
    .getAllSync(`SELECT image_url AS v FROM wishlist_item WHERE image_url LIKE 'local:%'`)
    .map((r) => r.v.slice('local:'.length));
  for (const name of names) {
    try {
      const file = new File(Paths.document, PHOTO_DIR, name);
      if (file.exists) photos[name] = await file.base64();
    } catch {
      // A missing photo shouldn't block the backup; the item falls back to its initial
    }
  }
  return photos;
}

function currentPrefs() {
  const { haptics, motion, appearance, accent } = usePrefs.getState();
  return { haptics, motion, appearance, accent };
}

// → 'shared' | 'unavailable'. Throws on unexpected errors.
export async function exportBackup() {
  if (!(await Sharing.isAvailableAsync())) return 'unavailable';
  const backup = buildBackup({ photos: await collectPhotos(), prefs: currentPrefs() });
  const file = new File(Paths.cache, backupFileName());
  if (file.exists) file.delete();
  file.create();
  file.write(JSON.stringify(backup));
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    UTI: 'public.json',
    dialogTitle: 'Save your TaskAllowance backup',
  });
  flags.set('lastBackupAt', new Date().toISOString());
  return 'shared';
}

// → { status: 'canceled' } | { status: 'invalid', error } | { status: 'ok', backup, summary }
export async function pickBackup() {
  const result = await DocumentPicker.getDocumentAsync({
    // Cloud drives often label .json as plain text or generic data
    type: ['application/json', 'text/plain', 'application/octet-stream'],
    copyToCacheDirectory: true,
  });
  if (result.canceled || !result.assets?.length) return { status: 'canceled' };

  let backup;
  try {
    backup = JSON.parse(await new File(result.assets[0].uri).text());
  } catch {
    return { status: 'invalid', error: 'That file isn’t a TaskAllowance backup.' };
  }
  const check = validateBackup(backup);
  if (!check.ok) return { status: 'invalid', error: check.error };
  return { status: 'ok', backup, summary: check.summary };
}

function restorePhotos(photos) {
  deleteAllItemPhotos();
  const entries = Object.entries(photos ?? {}).filter(
    ([name, data]) => SAFE_PHOTO_NAME.test(name) && typeof data === 'string'
  );
  if (!entries.length) return;
  const dir = new Directory(Paths.document, PHOTO_DIR);
  dir.create({ intermediates: true, idempotent: true });
  for (const [name, data] of entries) {
    try {
      const file = new File(dir, name);
      file.create({ overwrite: true });
      file.write(data, { encoding: 'base64' });
    } catch {
      // Skip a damaged photo; the card shows the title's initial instead
    }
  }
}

function restorePrefs(prefs) {
  if (!prefs || typeof prefs !== 'object') return;
  const p = usePrefs.getState();
  if (typeof prefs.haptics === 'boolean') p.setHaptics(prefs.haptics);
  if (['system', 'reduced', 'full'].includes(prefs.motion)) p.setMotion(prefs.motion);
  if (['system', 'light', 'dark'].includes(prefs.appearance)) p.setAppearance(prefs.appearance);
  if (ACCENTS.some((a) => a.key === prefs.accent)) p.setAccent(prefs.accent);
}

// Database first (all-or-nothing); photos and preferences only once it succeeded
export function applyBackup(backup) {
  const summary = restoreBackup(backup);
  restorePhotos(backup.photos);
  restorePrefs(backup.prefs);
  return summary;
}
