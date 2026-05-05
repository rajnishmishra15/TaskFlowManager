const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/dashboard - summary stats for current user
router.get('/', authenticate, (req, res) => {
  const userId = req.user.id;
  const isAdmin = req.user.role === 'admin';

  // Projects accessible by user
  const projectQuery = isAdmin
    ? 'SELECT COUNT(*) as count FROM projects'
    : `SELECT COUNT(*) as count FROM projects WHERE owner_id = ? OR id IN (SELECT project_id FROM project_members WHERE user_id = ?)`;

  const projectCount = isAdmin
    ? db.prepare(projectQuery).get()
    : db.prepare(projectQuery).get(userId, userId);

  // My tasks
  const myTasks = db.prepare(`
    SELECT t.*, p.name as project_name
    FROM tasks t JOIN projects p ON t.project_id = p.id
    WHERE t.assignee_id = ?
    ORDER BY t.due_date ASC
  `).all(userId);

  // Overdue tasks (assigned to me)
  const today = new Date().toISOString().split('T')[0];
  const overdueTasks = db.prepare(`
    SELECT t.*, p.name as project_name
    FROM tasks t JOIN projects p ON t.project_id = p.id
    WHERE t.assignee_id = ? AND t.due_date < ? AND t.status != 'done'
    ORDER BY t.due_date ASC
  `).all(userId, today);

  // Task status breakdown (my tasks)
  const myTaskStats = db.prepare(`
    SELECT status, COUNT(*) as count FROM tasks WHERE assignee_id = ? GROUP BY status
  `).all(userId);

  // All task stats (admin sees all, member sees accessible projects)
  let allTaskStats;
  if (isAdmin) {
    allTaskStats = db.prepare(`
      SELECT status, COUNT(*) as count FROM tasks GROUP BY status
    `).all();
  } else {
    allTaskStats = db.prepare(`
      SELECT t.status, COUNT(*) as count FROM tasks t
      JOIN projects p ON t.project_id = p.id
      WHERE p.owner_id = ? OR p.id IN (SELECT project_id FROM project_members WHERE user_id = ?)
      GROUP BY t.status
    `).all(userId, userId);
  }

  // Recent activity (recent tasks in accessible projects)
  let recentTasks;
  if (isAdmin) {
    recentTasks = db.prepare(`
      SELECT t.*, p.name as project_name, u.name as assignee_name
      FROM tasks t JOIN projects p ON t.project_id = p.id
      LEFT JOIN users u ON t.assignee_id = u.id
      ORDER BY t.updated_at DESC LIMIT 10
    `).all();
  } else {
    recentTasks = db.prepare(`
      SELECT t.*, p.name as project_name, u.name as assignee_name
      FROM tasks t JOIN projects p ON t.project_id = p.id
      LEFT JOIN users u ON t.assignee_id = u.id
      WHERE p.owner_id = ? OR p.id IN (SELECT project_id FROM project_members WHERE user_id = ?)
      ORDER BY t.updated_at DESC LIMIT 10
    `).all(userId, userId);
  }

  // Priority breakdown
  const priorityStats = db.prepare(`
    SELECT priority, COUNT(*) as count FROM tasks WHERE assignee_id = ? GROUP BY priority
  `).all(userId);

  res.json({
    stats: {
      totalProjects: projectCount.count,
      myTasks: myTasks.length,
      overdueTasks: overdueTasks.length,
      completedTasks: myTaskStats.find(s => s.status === 'done')?.count || 0
    },
    myTaskStats,
    allTaskStats,
    priorityStats,
    overdueTasks,
    recentTasks,
    myTasks: myTasks.slice(0, 5)
  });
});

module.exports = router;
