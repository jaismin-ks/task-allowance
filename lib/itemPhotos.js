// lib/itemPhotos.js
// Wishlist item photos picked from the library or camera. Each photo is downscaled,
// saved as JPEG in the app's documents folder, and stored in wishlist_item.image_url
// as "local:<file name>" — never an absolute path, because iOS changes the app
// container path on updates. Remote image links are stored as plain https URLs.
import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { isLocalImage } from './format';

export { isLocalImage };

const PREFIX = 'local:';
const MAX_WIDTH = 1200;

const photoDir = () => new Directory(Paths.document, 'wishlist-photos');
const fileFor = (value) => new File(photoDir(), value.slice(PREFIX.length));

// What <Image source={{ uri }}> needs for either kind of value
export function resolveImageUri(value) {
  if (!value) return null;
  if (!isLocalImage(value)) return value;
  try {
    return fileFor(value).uri;
  } catch {
    return null;
  }
}

// → { status: 'ok', value } | { status: 'canceled' } | { status: 'denied', canAskAgain }
export async function pickItemPhoto(source) {
  if (source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return { status: 'denied', canAskAgain: perm.canAskAgain };
  }
  // The system photo picker needs no library permission on iOS 14+ / Android 13+
  const options = { mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 1 };
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || !result.assets?.length) return { status: 'canceled' };

  // Phone photos can be 12MP+; keep them small enough for a wishlist card
  const asset = result.assets[0];
  const context = ImageManipulator.manipulate(asset.uri);
  if (asset.width > MAX_WIDTH) context.resize({ width: MAX_WIDTH });
  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({ compress: 0.8, format: SaveFormat.JPEG });

  const dir = photoDir();
  dir.create({ intermediates: true, idempotent: true });
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  await new File(saved.uri).move(new File(dir, name));
  return { status: 'ok', value: `${PREFIX}${name}` };
}

export function deleteItemPhoto(value) {
  if (!isLocalImage(value)) return;
  try {
    const f = fileFor(value);
    if (f.exists) f.delete();
  } catch {
    // Already gone — nothing to clean up
  }
}

export function deleteAllItemPhotos() {
  try {
    const dir = photoDir();
    if (dir.exists) dir.delete();
  } catch {
    // ignore
  }
}

// Backup: file name → base64 JPEG. Photos that have gone missing are left out.
export async function readItemPhotos(names) {
  const photos = {};
  for (const name of names) {
    try {
      const f = new File(photoDir(), name);
      if (f.exists) photos[name] = await f.base64();
    } catch {
      // Unreadable photo — the item is still backed up, just without its picture
    }
  }
  return photos;
}

// Restore: names were checked by lib/backup.js (plain file names only). Throws if a
// write fails, so the caller can stop before touching the database.
export function writeItemPhotos(photos) {
  const dir = photoDir();
  dir.create({ intermediates: true, idempotent: true });
  for (const [name, base64] of Object.entries(photos)) {
    const f = new File(dir, name);
    if (!f.exists) f.create();
    f.write(base64, { encoding: 'base64' });
  }
}

// Startup sweep: removes photos picked in a form that was then discarded
// (or left behind by a crash). `inUse` = image_url values still in the database.
export function cleanUpOrphanPhotos(inUse) {
  try {
    const dir = photoDir();
    if (!dir.exists) return;
    const keep = new Set(inUse.filter(isLocalImage).map((v) => v.slice(PREFIX.length)));
    for (const entry of dir.list()) {
      if (entry instanceof File && !keep.has(entry.name)) entry.delete();
    }
  } catch {
    // Best-effort housekeeping
  }
}
