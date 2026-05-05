const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'taskflow.db');

let SQL;
let db;

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'member' CHECK(role IN ('admin', 'member')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'completed', 'archived')),
    owner_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS project_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    role TEXT DEFAULT 'member' CHECK(role IN ('admin', 'member')),
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, user_id),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'todo' CHECK(status IN ('todo', 'in_progress', 'review', 'done')),
    priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'urgent')),
    project_id INTEGER NOT NULL,
    assignee_id INTEGER,
    reporter_id INTEGER NOT NULL,
    due_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`;

function persist() {
  try {
    const data = db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  } catch (err) {
    console.error('Failed to persist DB:', err);
  }
}

function prepareWrapper(sql) {
  return {
    get: function(...params) {
      const stmt = db.prepare(sql);
      try {
        if (params && params.length) stmt.bind(params);
        if (stmt.step()) {
          const row = stmt.getAsObject();
          return row;
        }
        return undefined;
      } finally {
        stmt.free();
      }
    },
    all: function(...params) {
      const stmt = db.prepare(sql);
      const rows = [];
      try {
        if (params && params.length) stmt.bind(params);
        while (stmt.step()) rows.push(stmt.getAsObject());
        return rows;
      } finally {
        stmt.free();
      }
    },
    run: function(...params) {
      // Use a prepared statement for parameter binding, then persist and return lastInsertRowid
      const stmt = db.prepare(sql);
      try {
        if (params && params.length) stmt.bind(params);
        stmt.step();
      } finally {
        stmt.free();
      }
      // Persist DB after write
      persist();
      // Get last insert id if available
      try {
        const res = db.exec('SELECT last_insert_rowid() as id');
        const last = res && res[0] && res[0].values && res[0].values[0] ? res[0].values[0][0] : null;
        return { lastInsertRowid: last };
      } catch (err) {
        return {};
      }
    }
  };
}

let readyResolve;
const ready = new Promise((resolve) => { readyResolve = resolve; });

(async () => {
  try {
    SQL = await initSqlJs();
    if (fs.existsSync(DB_PATH)) {
      const filebuffer = fs.readFileSync(DB_PATH);
      db = new SQL.Database(new Uint8Array(filebuffer));
    } else {
      db = new SQL.Database();
      db.run(SCHEMA);
      persist();
    }
    console.log('✅ Database (sql.js) initialized at', DB_PATH);
    readyResolve();
  } catch (err) {
    console.error('Failed to initialize sql.js DB:', err);
    process.exit(1);
  }
})();

module.exports = {
  ready,
  prepare: (sql) => prepareWrapper(sql),
  exec: (sql) => {
    const res = db.exec(sql);
    return res;
  }
};
