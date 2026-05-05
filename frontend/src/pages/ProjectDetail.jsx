import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import {
  Plus, ArrowLeft, Users, Settings, X, AlertCircle, Trash2, Pencil,
  Calendar, Flag, User, MessageSquare, ChevronDown
} from 'lucide-react';
import { format, isPast, parseISO } from 'date-fns';

const STATUS_COLS = [
  { key: 'todo', label: 'To Do', color: 'var(--text-muted)' },
  { key: 'in_progress', label: 'In Progress', color: 'var(--blue)' },
  { key: 'review', label: 'In Review', color: 'var(--yellow)' },
  { key: 'done', label: 'Done', color: 'var(--green)' },
];
const PRIORITY_COLORS = { low: 'var(--text-muted)', medium: 'var(--blue)', high: 'var(--yellow)', urgent: 'var(--red)' };

function TaskModal({ projectId, task, members, currentUser, onClose, onSave }) {
  const [form, setForm] = useState({
    title: task?.title || '', description: task?.description || '',
    status: task?.status || 'todo', priority: task?.priority || 'medium',
    assignee_id: task?.assignee_id || '', due_date: task?.due_date || ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('Title is required'); return; }
    setLoading(true);
    try {
      const payload = { ...form, assignee_id: form.assignee_id || null, due_date: form.due_date || null };
      let res;
      if (task) {
        res = await api.put(`/projects/${projectId}/tasks/${task.id}`, payload);
      } else {
        res = await api.post(`/projects/${projectId}/tasks`, payload);
      }
      onSave(res.data.task, !task);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 580 }}>
        <div className="modal-header">
          <h2 className="modal-title">{task ? 'Edit Task' : 'New Task'}</h2>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        {error && <div className="alert alert-error"><AlertCircle size={15} />{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input type="text" placeholder="Task title..." value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))} autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea rows={3} placeholder="Describe the task..."
              value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              style={{ resize: 'vertical' }} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="review">In Review</option>
                <option value="done">Done</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Assignee</label>
              <select value={form.assignee_id} onChange={e => setForm(f => ({ ...f, assignee_id: e.target.value }))}>
                <option value="">Unassigned</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Due Date</label>
              <input type="date" value={form.due_date}
                onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : task ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddMemberModal({ projectId, onClose, onAdd }) {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [role, setRole] = useState('member');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { api.get('/auth/users').then(res => setUsers(res.data.users)); }, []);

  const handleAdd = async () => {
    if (!selectedUser) { setError('Please select a user'); return; }
    setLoading(true);
    try {
      await api.post(`/projects/${projectId}/members`, { userId: parseInt(selectedUser), role });
      onAdd();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <h2 className="modal-title">Add Team Member</h2>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        {error && <div className="alert alert-error"><AlertCircle size={15} />{error}</div>}
        <div className="form-group">
          <label className="form-label">User</label>
          <select value={selectedUser} onChange={e => setSelectedUser(e.target.value)}>
            <option value="">Select user...</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Project Role</label>
          <select value={role} onChange={e => setRole(e.target.value)}>
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAdd} disabled={loading}>
            {loading ? 'Adding...' : 'Add Member'}
          </button>
        </div>
      </div>
    </div>
  );
}

function TaskCard({ task, onEdit, onDelete, isAdmin }) {
  const overdue = task.due_date && isPast(parseISO(task.due_date)) && task.status !== 'done';
  return (
    <div style={{
      background: 'var(--bg-elevated)', border: '1px solid var(--border)',
      borderRadius: 10, padding: '14px', marginBottom: 10, cursor: 'pointer',
      transition: 'border-color 0.15s, transform 0.15s',
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span className={`badge badge-${task.priority}`}>{task.priority}</span>
        {isAdmin && (
          <div style={{ display: 'flex', gap: 2 }}>
            <button className="btn-icon" style={{ padding: 4 }} onClick={() => onEdit(task)}><Pencil size={12} /></button>
            <button className="btn-icon" style={{ padding: 4, color: 'var(--red)' }} onClick={() => onDelete(task.id)}><Trash2 size={12} /></button>
          </div>
        )}
      </div>
      <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8, lineHeight: 1.4 }} onClick={() => onEdit(task)}>
        {task.title}
      </div>
      {task.description && (
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {task.description}
        </p>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
        {task.assignee_name && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-secondary)' }}>
            <User size={11} />{task.assignee_name}
          </div>
        )}
        {task.due_date && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: overdue ? 'var(--red)' : 'var(--text-muted)' }}>
            <Calendar size={11} />{task.due_date}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProjectDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [activeTab, setActiveTab] = useState('board');

  const fetchData = async () => {
    try {
      const [projRes, tasksRes] = await Promise.all([
        api.get(`/projects/${id}`),
        api.get(`/projects/${id}/tasks`)
      ]);
      setProject(projRes.data.project);
      setMembers(projRes.data.members);
      setTasks(tasksRes.data.tasks);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [id]);

  const isAdmin = user.role === 'admin' || project?.owner_id === user.id ||
    members.find(m => m.id === user.id)?.role === 'admin';

  const handleTaskSave = (task, isNew) => {
    setTasks(prev => isNew ? [task, ...prev] : prev.map(t => t.id === task.id ? task : t));
  };

  const handleDeleteTask = async (taskId) => {
    if (!confirm('Delete this task?')) return;
    await api.delete(`/projects/${id}/tasks/${taskId}`);
    setTasks(prev => prev.filter(t => t.id !== taskId));
  };

  const handleRemoveMember = async (userId) => {
    if (!confirm('Remove this member?')) return;
    await api.delete(`/projects/${id}/members/${userId}`);
    setMembers(prev => prev.filter(m => m.id !== userId));
  };

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  if (!project) return <div style={{ padding: 20 }}>Project not found</div>;

  const tasksByStatus = STATUS_COLS.reduce((acc, col) => {
    acc[col.key] = tasks.filter(t => t.status === col.key);
    return acc;
  }, {});

  return (
    <div className="animate-in" style={{ height: '100%' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Link to="/projects" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
          <ArrowLeft size={14} /> Back to Projects
        </Link>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <h1 className="page-title" style={{ fontSize: 24 }}>{project.name}</h1>
              <span className={`badge badge-${project.status}`}>{project.status}</span>
            </div>
            {project.description && <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{project.description}</p>}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {isAdmin && (
              <button className="btn btn-secondary btn-sm" onClick={() => setShowMemberModal(true)}>
                <Users size={14} /> Add Member
              </button>
            )}
            <button className="btn btn-primary btn-sm" onClick={() => setShowTaskModal(true)}>
              <Plus size={14} /> Add Task
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {[['board', 'Board'], ['members', 'Team Members']].map(([key, label]) => (
          <button key={key} onClick={() => setActiveTab(key)} style={{
            padding: '8px 16px', fontSize: 13, fontWeight: 500, background: 'none', border: 'none',
            color: activeTab === key ? 'var(--accent)' : 'var(--text-secondary)',
            borderBottom: `2px solid ${activeTab === key ? 'var(--accent)' : 'transparent'}`,
            transition: 'all 0.15s', marginBottom: -1
          }}>{label}</button>
        ))}
      </div>

      {/* Board */}
      {activeTab === 'board' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, alignItems: 'start' }}>
          {STATUS_COLS.map(col => (
            <div key={col.key}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, padding: '8px 12px', background: 'var(--bg-card)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.color }} />
                  <span style={{ fontSize: 12, fontWeight: 600, fontFamily: 'Syne' }}>{col.label}</span>
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-elevated)', padding: '2px 8px', borderRadius: 20 }}>
                  {tasksByStatus[col.key].length}
                </span>
              </div>
              <div style={{ minHeight: 200 }}>
                {tasksByStatus[col.key].map(task => (
                  <TaskCard key={task.id} task={task} isAdmin={isAdmin}
                    onEdit={t => setEditTask(t)} onDelete={handleDeleteTask} />
                ))}
                {tasksByStatus[col.key].length === 0 && (
                  <div style={{ padding: '20px 12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, border: '2px dashed var(--border)', borderRadius: 10 }}>
                    No tasks here
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Members */}
      {activeTab === 'members' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 600 }}>
          {members.map(member => (
            <div key={member.id} className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%', background: 'var(--accent-dim)',
                border: '2px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)' }}>{member.name[0].toUpperCase()}</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{member.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{member.email}</div>
              </div>
              <span className={`badge badge-${member.role}`}>{member.role}</span>
              {isAdmin && member.id !== project.owner_id && member.id !== user.id && (
                <button className="btn-icon" style={{ color: 'var(--red)' }} onClick={() => handleRemoveMember(member.id)}>
                  <Trash2 size={14} />
                </button>
              )}
              {member.id === project.owner_id && (
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Owner</span>
              )}
            </div>
          ))}
        </div>
      )}

      {(showTaskModal || editTask) && (
        <TaskModal
          projectId={id} task={editTask} members={members} currentUser={user}
          onClose={() => { setShowTaskModal(false); setEditTask(null); }}
          onSave={handleTaskSave}
        />
      )}
      {showMemberModal && (
        <AddMemberModal projectId={id} onClose={() => setShowMemberModal(false)} onAdd={fetchData} />
      )}
    </div>
  );
}
