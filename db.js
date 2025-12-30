const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'library.db');
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let SQL = null;
let db = null;
let initPromise = null;

async function persist() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

async function initDb() {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    SQL = await initSqlJs({
      locateFile: (file) => path.join(__dirname, 'node_modules', 'sql.js', 'dist', file),
    });

    const existing = fs.existsSync(DB_PATH) ? fs.readFileSync(DB_PATH) : null;
    db = existing ? new SQL.Database(new Uint8Array(existing)) : new SQL.Database();

    db.run(`
      CREATE TABLE IF NOT EXISTS books (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        category TEXT,
        copies_total INTEGER NOT NULL DEFAULT 1,
        copies_available INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS loans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        book_id INTEGER NOT NULL,
        borrower_name TEXT NOT NULL,
        borrower_email TEXT,
        status TEXT NOT NULL DEFAULT 'borrowed',
        loaned_at TEXT NOT NULL DEFAULT (datetime('now')),
        due_date TEXT,
        returned_at TEXT,
        FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
      );
    `);

    await persist();
    return db;
  })();

  return initPromise;
}

async function run(sql, params = []) {
  await initDb();
  const stmt = db.prepare(sql);
  stmt.bind(params);
  stmt.step();
  stmt.free();
  const idRow = db.exec(`SELECT last_insert_rowid() AS id`)[0];
  await persist();
  return idRow?.values?.[0]?.[0] ?? null;
}

async function all(sql, params = []) {
  await initDb();
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

async function get(sql, params = []) {
  const rows = await all(sql, params);
  return rows[0] || null;
}

module.exports = {
  initDb,
  run,
  all,
  get,
};
