// tests/sqliteClient.js
// Test stand-in for db/client.js: the same synchronous API the app uses from
// expo-sqlite (getAllSync / getFirstSync / runSync / withTransactionSync), backed
// by Node's built-in SQLite and migrated with the app's real Drizzle migrations.
// Needs Node 22.13+ (node:sqlite without a flag).
const fs = require('fs');
const path = require('path');

// process.getBuiltinModule sidesteps Jest's resolver, which doesn't know node:sqlite
const { DatabaseSync } = process.getBuiltinModule('node:sqlite');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'db', 'migrations');
const journal = require('../db/migrations/meta/_journal.json');

let raw;

function migrate(database) {
  for (const { tag } of journal.entries) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, `${tag}.sql`), 'utf8');
    for (const statement of sql.split('--> statement-breakpoint')) {
      if (statement.trim()) database.exec(statement);
    }
  }
}

// Fresh, fully migrated in-memory database. Call in beforeEach.
function resetDb() {
  raw?.close();
  raw = new DatabaseSync(':memory:');
  migrate(raw);
}

const sqlite = {
  getAllSync: (sql, params = []) => raw.prepare(sql).all(...params),
  getFirstSync: (sql, params = []) => raw.prepare(sql).get(...params) ?? null,
  runSync: (sql, params = []) => raw.prepare(sql).run(...params),
  execSync: (sql) => raw.exec(sql),
  withTransactionSync: (fn) => {
    raw.exec('BEGIN');
    try {
      fn();
      raw.exec('COMMIT');
    } catch (e) {
      raw.exec('ROLLBACK');
      throw e;
    }
  },
};

resetDb();

module.exports = { sqlite, db: null, resetDb };
