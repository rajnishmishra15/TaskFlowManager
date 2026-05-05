const dbModule = require('./db');
const bcrypt = require('bcryptjs');

async function seed() {
  await dbModule.ready;
  const db = dbModule;

  // helper to run queries
  const run = (sql, ...params) => db.prepare(sql).run(...params);
  const get = (sql, ...params) => db.prepare(sql).get(...params);

  console.log('Seeding demo data...');

  // Create admin user
  const adminPass = bcrypt.hashSync('password123', 10);
  const res1 = run('INSERT OR IGNORE INTO users (name, email, password, role) VALUES (?, ?, ?, ?)', 'Admin User', 'admin@example.com', adminPass, 'admin');
  const adminId = res1.lastInsertRowid || get('SELECT id FROM users WHERE email = ?', 'admin@example.com').id;

  // Create member user
  const memberPass = bcrypt.hashSync('password123', 10);
  const res2 = run('INSERT OR IGNORE INTO users (name, email, password, role) VALUES (?, ?, ?, ?)', 'Demo User', 'demo@example.com', memberPass, 'member');
  const memberId = res2.lastInsertRowid || get('SELECT id FROM users WHERE email = ?', 'demo@example.com').id;

  // Create a project
  const p = run('INSERT INTO projects (name, description, owner_id) VALUES (?, ?, ?)', 'Demo Project', 'A sample seeded project', adminId);
  const projectId = p.lastInsertRowid;

  // Add member to project
  try { run('INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)', projectId, memberId, 'member'); } catch (e) {}

  // Create tasks
  const t1 = run('INSERT INTO tasks (title, description, priority, assignee_id, reporter_id, project_id, due_date) VALUES (?, ?, ?, ?, ?, ?, ?)', 'Setup project', 'Initialize settings and board', 'high', adminId, adminId, projectId, null);
  const t2 = run('INSERT INTO tasks (title, description, priority, assignee_id, reporter_id, project_id, due_date) VALUES (?, ?, ?, ?, ?, ?, ?)', 'Create first task', 'This is a demo task assigned to demo user', 'medium', memberId, adminId, projectId, null);

  // Comments
  run('INSERT INTO comments (task_id, user_id, content) VALUES (?, ?, ?)', t2.lastInsertRowid, adminId, 'Welcome! Please update the task status when started.');

  console.log('Seeding completed.');
  process.exit(0);
}

seed().catch(err => { console.error('Seeding failed:', err); process.exit(1); });
