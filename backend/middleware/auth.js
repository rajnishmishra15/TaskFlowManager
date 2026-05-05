const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'taskflow-super-secret-key-change-in-prod';

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(decoded.userId);
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

const requireProjectAccess = (req, res, next) => {
  const projectId = req.params.projectId || req.params.id;
  const member = db.prepare(
    'SELECT * FROM project_members WHERE project_id = ? AND user_id = ?'
  ).get(projectId, req.user.id);

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  if (req.user.role === 'admin' || project.owner_id === req.user.id || member) {
    req.project = project;
    req.projectMember = member;
    next();
  } else {
    return res.status(403).json({ error: 'Access denied to this project' });
  }
};

const requireProjectAdmin = (req, res, next) => {
  const project = req.project;
  if (req.user.role === 'admin' || project.owner_id === req.user.id ||
    (req.projectMember && req.projectMember.role === 'admin')) {
    next();
  } else {
    return res.status(403).json({ error: 'Project admin access required' });
  }
};

module.exports = { authenticate, requireAdmin, requireProjectAccess, requireProjectAdmin, JWT_SECRET };
