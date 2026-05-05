const express = require('express');
const db = require('../db');
const { authenticate, requireProjectAccess, requireProjectAdmin } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

// GET /api/projects/:projectId/tasks
router.get('/', authenticate, requireProjectAccess, (req, res) => {
  const { status, priority, assignee } = req.query;
  let query = `
    SELECT t.*, 
      u1.name as assignee_name, u1.email as assignee_email,
      u2.name as reporter_name
    FROM tasks t
    LEFT JOIN users u1 ON t.assignee_id = u1.id
    LEFT JOIN users u2 ON t.reporter_id = u2.id
    WHERE t.project_id = ?
  `;
  const params = [req.params.projectId];

  if (status) { query += ' AND t.status = ?'; params.push(status); }
  if (priority) { query += ' AND t.priority = ?'; params.push(priority); }
  if (assignee) { query += ' AND t.assignee_id = ?'; params.push(assignee); }

  query += ' ORDER BY t.created_at DESC';
  const tasks = db.prepare(query).all(...params);
  res.json({ tasks });
});

// POST /api/projects/:projectId/tasks
router.post('/', authenticate, requireProjectAccess, (req, res) => {
  const { title, description, priority, assignee_id, due_date } = req.body;
  if (!title) return res.status(400).json({ error: 'Task title is required' });

  if (assignee_id) {
    const isMember = db.prepare(
      'SELECT id FROM project_members WHERE project_id = ? AND user_id = ?'
    ).get(req.params.projectId, assignee_id);
    if (!isMember) return res.status(400).json({ error: 'Assignee must be a project member' });
  }

  const result = db.prepare(`
    INSERT INTO tasks (title, description, priority, assignee_id, reporter_id, project_id, due_date)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(title, description || null, priority || 'medium', assignee_id || null, req.user.id, req.params.projectId, due_date || null);

  const task = db.prepare(`
    SELECT t.*, u1.name as assignee_name, u2.name as reporter_name
    FROM tasks t
    LEFT JOIN users u1 ON t.assignee_id = u1.id
    LEFT JOIN users u2 ON t.reporter_id = u2.id
    WHERE t.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json({ task });
});

// GET /api/projects/:projectId/tasks/:id
router.get('/:id', authenticate, requireProjectAccess, (req, res) => {
  const task = db.prepare(`
    SELECT t.*, u1.name as assignee_name, u1.email as assignee_email, u2.name as reporter_name
    FROM tasks t
    LEFT JOIN users u1 ON t.assignee_id = u1.id
    LEFT JOIN users u2 ON t.reporter_id = u2.id
    WHERE t.id = ? AND t.project_id = ?
  `).get(req.params.id, req.params.projectId);

  if (!task) return res.status(404).json({ error: 'Task not found' });

  const comments = db.prepare(`
    SELECT c.*, u.name as user_name, u.email as user_email
    FROM comments c JOIN users u ON c.user_id = u.id
    WHERE c.task_id = ? ORDER BY c.created_at ASC
  `).all(req.params.id);

  res.json({ task, comments });
});

// PUT /api/projects/:projectId/tasks/:id
router.put('/:id', authenticate, requireProjectAccess, (req, res) => {
  const { title, description, status, priority, assignee_id, due_date } = req.body;

  const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND project_id = ?')
    .get(req.params.id, req.params.projectId);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  // Members can only update status of their assigned tasks; admins/owners can update everything
  const isProjectAdmin = req.user.role === 'admin' ||
    req.project.owner_id === req.user.id ||
    (req.projectMember && req.projectMember.role === 'admin');

  if (!isProjectAdmin && task.assignee_id !== req.user.id)
    return res.status(403).json({ error: 'You can only update tasks assigned to you' });

  db.prepare(`
    UPDATE tasks SET 
      title = ?, description = ?, status = ?, priority = ?,
      assignee_id = ?, due_date = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    title || task.title,
    description !== undefined ? description : task.description,
    status || task.status,
    priority || task.priority,
    assignee_id !== undefined ? (assignee_id || null) : task.assignee_id,
    due_date !== undefined ? (due_date || null) : task.due_date,
    req.params.id
  );

  const updated = db.prepare(`
    SELECT t.*, u1.name as assignee_name, u2.name as reporter_name
    FROM tasks t LEFT JOIN users u1 ON t.assignee_id = u1.id
    LEFT JOIN users u2 ON t.reporter_id = u2.id WHERE t.id = ?
  `).get(req.params.id);

  res.json({ task: updated });
});

// DELETE /api/projects/:projectId/tasks/:id
router.delete('/:id', authenticate, requireProjectAccess, requireProjectAdmin, (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND project_id = ?')
    .get(req.params.id, req.params.projectId);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  res.json({ message: 'Task deleted' });
});

// POST /api/projects/:projectId/tasks/:id/comments
router.post('/:id/comments', authenticate, requireProjectAccess, (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'Comment content required' });

  const task = db.prepare('SELECT id FROM tasks WHERE id = ? AND project_id = ?')
    .get(req.params.id, req.params.projectId);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const result = db.prepare(
    'INSERT INTO comments (task_id, user_id, content) VALUES (?, ?, ?)'
  ).run(req.params.id, req.user.id, content);

  const comment = db.prepare(`
    SELECT c.*, u.name as user_name FROM comments c JOIN users u ON c.user_id = u.id WHERE c.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json({ comment });
});

module.exports = router;
