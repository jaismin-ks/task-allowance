import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  backupFileName,
  localPhotoNames,
  migrateBackup,
  parseBackup,
  serializeBackup,
  summarizeBackup,
  validateBackup,
} from '../lib/backup';

const EXPORTED_AT = new Date('2026-10-16T09:30:00.000Z');

// Rows shaped the way sqlite.getAllSync returns them
function sampleRows() {
  return {
    user_profile: [
      {
        id: 'p1',
        display_name: 'Sam',
        monthly_allowance_cap: 150,
        daily_task_cap: null,
        currency_code: 'CAD',
        voice_input_enabled: 1,
        created_at: '2026-08-01 10:00:00',
        updated_at: '2026-10-01 10:00:00',
      },
    ],
    task_series: [
      {
        id: 's1',
        title: 'Walk the dog',
        monetary_value: 2,
        effort_rating: 2,
        source: 'manual',
        frequency: 'weekly',
        weekdays: '1,4',
        month_day: null,
        start_date: '2026-09-01',
        last_generated_date: '2026-10-16',
        active: 1,
        created_at: '2026-09-01 10:00:00',
      },
    ],
    allowance_pool: [
      {
        id: 'm9',
        month_key: '2026-09',
        monthly_budget_cap: 150,
        total_earned: 42.5,
        total_spent: 0,
        created_at: '2026-09-01 10:00:00',
      },
      {
        id: 'm10',
        month_key: '2026-10',
        monthly_budget_cap: 150,
        total_earned: 12,
        total_spent: 30,
        created_at: '2026-10-01 10:00:00',
      },
    ],
    wishlist_item: [
      {
        id: 'w1',
        product_url: 'https://example.com/bike',
        title: 'Bike',
        image_url: 'local:111-abc.jpg',
        price: 300,
        currency: null,
        priority_flag: 1,
        scrape_status: 'success',
        purchased_at: null,
        added_at: '2026-09-02 10:00:00',
      },
      {
        id: 'w2',
        product_url: null,
        title: 'Book',
        image_url: 'https://example.com/book.jpg',
        price: 12,
        currency: null,
        priority_flag: 0,
        scrape_status: 'manual',
        purchased_at: '2026-10-01 10:00:00',
        added_at: '2026-09-03 10:00:00',
      },
    ],
    task: [
      {
        id: 't1',
        title: 'Dishes',
        monetary_value: 1.5,
        effort_rating: 1,
        completion_status: 'completed',
        source: 'manual',
        task_pack_id: null,
        series_id: null,
        due_date: null,
        completed_at: '2026-10-15 18:00:00',
        timestamp: '2026-10-15 09:00:00',
      },
      {
        id: 't2',
        title: 'Walk the dog',
        monetary_value: 2,
        effort_rating: 2,
        completion_status: 'pending',
        source: 'manual',
        task_pack_id: null,
        series_id: 's1',
        due_date: '2026-10-16',
        completed_at: null,
        timestamp: '2026-10-16 06:00:00',
      },
    ],
  };
}

const photos = { '111-abc.jpg': 'aGVsbG8=' };
const makeBackup = () =>
  JSON.parse(JSON.stringify(serializeBackup({ rows: sampleRows(), photos, exportedAt: EXPORTED_AT, appVersion: '1.0.0' })));

describe('serializeBackup', () => {
  test('writes the envelope and every table', () => {
    const b = serializeBackup({ rows: sampleRows(), photos, exportedAt: EXPORTED_AT, appVersion: '1.0.0' });
    expect(b.format).toBe(BACKUP_FORMAT);
    expect(b.version).toBe(BACKUP_VERSION);
    expect(b.exportedAt).toBe('2026-10-16T09:30:00.000Z');
    expect(b.appVersion).toBe('1.0.0');
    expect(Object.keys(b.data).sort()).toEqual(['allowance_pool', 'task', 'task_series', 'user_profile', 'wishlist_item']);
    expect(b.data.task).toHaveLength(2);
    expect(b.data.allowance_pool[1]).toEqual(sampleRows().allowance_pool[1]);
  });

  test('keeps only photos a wishlist item uses', () => {
    const b = serializeBackup({ rows: sampleRows(), photos: { ...photos, 'stray.jpg': 'eA==' } });
    expect(b.photos).toEqual(photos);
  });

  test('drops unknown columns and fills missing ones with null', () => {
    const rows = sampleRows();
    rows.task[0].extra = 'nope';
    delete rows.task[0].task_pack_id;
    const b = serializeBackup({ rows });
    expect(b.data.task[0]).not.toHaveProperty('extra');
    expect(b.data.task[0].task_pack_id).toBeNull();
  });

  test('stores booleans as 0/1', () => {
    const rows = sampleRows();
    rows.user_profile[0].voice_input_enabled = false;
    expect(serializeBackup({ rows }).data.user_profile[0].voice_input_enabled).toBe(0);
  });

  test('handles an empty phone', () => {
    const b = serializeBackup({ rows: {} });
    expect(b.data.task).toEqual([]);
    expect(b.photos).toEqual({});
  });
});

describe('localPhotoNames', () => {
  test('lists local photo files once, ignoring links and empty values', () => {
    const rows = [{ image_url: 'local:a.jpg' }, { image_url: 'https://x/y.jpg' }, { image_url: null }, { image_url: 'local:a.jpg' }];
    expect(localPhotoNames(rows)).toEqual(['a.jpg']);
  });
});

describe('backupFileName', () => {
  test('uses the local date', () => {
    expect(backupFileName(new Date(2026, 0, 5, 23, 59))).toBe('taskallowance-backup-2026-01-05.json');
  });
});

describe('migrateBackup', () => {
  test('passes a current backup through unchanged', () => {
    const b = makeBackup();
    expect(migrateBackup(b)).toEqual({ ok: true, backup: b });
  });

  test('refuses a backup from a newer app', () => {
    expect(migrateBackup({ ...makeBackup(), version: BACKUP_VERSION + 1 })).toEqual({ ok: false, error: 'newer-version' });
  });

  test('refuses a missing or invalid version', () => {
    expect(migrateBackup({ ...makeBackup(), version: undefined }).error).toBe('damaged');
    expect(migrateBackup({ ...makeBackup(), version: '1' }).error).toBe('damaged');
    expect(migrateBackup({ ...makeBackup(), version: 0 }).error).toBe('damaged');
  });

  test('runs each step in order up to the target version', () => {
    const steps = {
      1: (b) => ({ ...b, trail: [...(b.trail ?? []), 'v1→v2'] }),
      2: (b) => ({ ...b, trail: [...b.trail, 'v2→v3'] }),
    };
    const result = migrateBackup({ version: 1 }, steps, 3);
    expect(result).toEqual({ ok: true, backup: { version: 3, trail: ['v1→v2', 'v2→v3'] } });
  });

  test('refuses an old version with no upgrade path', () => {
    expect(migrateBackup({ version: 1 }, {}, 2)).toEqual({ ok: false, error: 'damaged' });
  });
});

describe('validateBackup', () => {
  test('accepts a backup it wrote', () => {
    const result = validateBackup(makeBackup());
    expect(result.ok).toBe(true);
    expect(result.backup.data).toEqual(makeBackup().data);
    expect(result.backup.photos).toEqual(photos);
  });

  test('accepts true/false for booleans and stores 0/1', () => {
    const b = makeBackup();
    b.data.wishlist_item[0].priority_flag = true;
    b.data.wishlist_item[1].priority_flag = false;
    const result = validateBackup(b);
    expect(result.backup.data.wishlist_item.map((i) => i.priority_flag)).toEqual([1, 0]);
  });

  test('treats missing nullable columns as null', () => {
    const b = makeBackup();
    delete b.data.task[0].task_pack_id;
    expect(validateBackup(b).backup.data.task[0].task_pack_id).toBeNull();
  });

  test('clears a photo ref whose photo is missing, keeping the item', () => {
    const b = makeBackup();
    b.photos = {};
    const result = validateBackup(b);
    expect(result.ok).toBe(true);
    expect(result.backup.data.wishlist_item[0]).toMatchObject({ title: 'Bike', image_url: null });
  });

  test('accepts a backup with no photos key', () => {
    const b = makeBackup();
    delete b.photos;
    expect(validateBackup(b).ok).toBe(true);
  });

  const broken = {
    'a missing table': (b) => delete b.data.task_series,
    'a table that is not a list': (b) => (b.data.task = {}),
    'a row that is not an object': (b) => b.data.task.push('Dishes'),
    'a missing required column': (b) => delete b.data.task[0].title,
    'a wrong type': (b) => (b.data.task[0].monetary_value = '1.50'),
    'a non-finite number': (b) => (b.data.allowance_pool[0].total_earned = Infinity),
    'a fractional effort rating': (b) => (b.data.task[0].effort_rating = 1.5),
    'a bad boolean': (b) => (b.data.task_series[0].active = 'yes'),
    'an unknown task status': (b) => (b.data.task[0].completion_status = 'skipped'),
    'an unknown repeat frequency': (b) => (b.data.task_series[0].frequency = 'hourly'),
    'a duplicate id': (b) => b.data.task.push({ ...b.data.task[0] }),
    'no profile': (b) => (b.data.user_profile = []),
    'two profiles': (b) => b.data.user_profile.push({ ...b.data.user_profile[0], id: 'p2' }),
    'two goals': (b) => (b.data.wishlist_item[1].priority_flag = 1),
    'a repeated month': (b) => (b.data.allowance_pool[1].month_key = '2026-09'),
    'a repeated occurrence': (b) => b.data.task.push({ ...b.data.task[1], id: 't3' }),
    'a bad export date': (b) => (b.exportedAt = 'yesterday'),
    'a path in a photo name': (b) => (b.photos['../../evil.jpg'] = 'eA=='),
    'photo data that is not base64': (b) => (b.photos['111-abc.jpg'] = 'not base64!'),
    'photos that are not an object': (b) => (b.photos = ['eA==']),
  };
  test.each(Object.keys(broken))('rejects %s', (name) => {
    const b = makeBackup();
    broken[name](b);
    expect(validateBackup(b)).toEqual({ ok: false, error: 'damaged' });
  });
});

describe('parseBackup', () => {
  test('round-trips through JSON', () => {
    const text = JSON.stringify(serializeBackup({ rows: sampleRows(), photos, exportedAt: EXPORTED_AT }));
    const result = parseBackup(text);
    expect(result.ok).toBe(true);
    expect(result.backup.data.task_series).toEqual(sampleRows().task_series);
  });

  test.each([
    ['text that is not JSON', 'hello'],
    ['an empty file', ''],
    ['a JSON list', '[]'],
    ['JSON without the backup marker', '{"data":{}}'],
    ['another app’s file', '{"format":"other-app","version":1}'],
  ])('calls %s not a backup', (_, text) => {
    expect(parseBackup(text)).toEqual({ ok: false, error: 'not-backup' });
  });

  test('reports a newer version before checking rows', () => {
    const text = JSON.stringify({ format: BACKUP_FORMAT, version: BACKUP_VERSION + 1, data: { anything: true } });
    expect(parseBackup(text)).toEqual({ ok: false, error: 'newer-version' });
  });

  test('reports damage inside a real backup', () => {
    const b = makeBackup();
    b.data.task = null;
    expect(parseBackup(JSON.stringify(b))).toEqual({ ok: false, error: 'damaged' });
  });
});

describe('summarizeBackup', () => {
  test('counts what will be restored', () => {
    const s = summarizeBackup(validateBackup(makeBackup()).backup);
    expect(s).toEqual({ exportedAt: EXPORTED_AT, tasks: 2, completedTasks: 1, wishlistItems: 2 });
  });
});
