// lib/backupFile.js — "Back up data" and "Restore from backup" in Settings.
// Export writes a JSON file to the cache folder and opens the share sheet (Files,
// AirDrop, email…). Restore reads a picked file, checks it with lib/backup.js and
// only then replaces the database.
import Constants from 'expo-constants';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { sqlite } from '../db/client';
import { readAllRows, replaceAllData } from '../db/operations/backup';
import { backupFileName, localPhotoNames, parseBackup, serializeBackup } from './backup';
import { cleanUpOrphanPhotos, readItemPhotos, writeItemPhotos } from './itemPhotos';

// → { status: 'shared' } | { status: 'unavailable' }
export async function exportBackup() {
  if (!(await Sharing.isAvailableAsync())) return { status: 'unavailable' };
  const rows = readAllRows();
  const photos = await readItemPhotos(localPhotoNames(rows.wishlist_item));
  const backup = serializeBackup({ rows, photos, appVersion: Constants.expoConfig?.version ?? null });

  const file = new File(Paths.cache, backupFileName());
  file.create({ overwrite: true });
  file.write(JSON.stringify(backup));
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: 'Back up data' });
  return { status: 'shared' };
}

// → { status: 'canceled' } | { status: 'ok', backup } | { status: 'invalid', error }
export async function pickBackup() {
  // Any file type: a backup sent by email or chat may lose its JSON type, and
  // parseBackup turns away anything that isn't one
  const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
  if (result.canceled || !result.assets?.length) return { status: 'canceled' };

  const picked = new File(result.assets[0].uri);
  let text;
  try {
    text = await picked.text();
  } catch {
    return { status: 'invalid', error: 'not-backup' };
  } finally {
    try {
      picked.delete(); // the picker's cache copy
    } catch {
      // Already gone
    }
  }
  const parsed = parseBackup(text);
  return parsed.ok ? { status: 'ok', backup: parsed.backup } : { status: 'invalid', error: parsed.error };
}

// Photos first: if one can't be written this throws before the database is touched.
// The database swap is a single transaction. Photos from the old data are swept after.
export function restoreBackup(backup) {
  writeItemPhotos(backup.photos);
  replaceAllData(backup);
  const inUse = sqlite
    .getAllSync(`SELECT image_url AS imageUrl FROM wishlist_item WHERE image_url IS NOT NULL`)
    .map((r) => r.imageUrl);
  cleanUpOrphanPhotos(inUse);
}
