import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { Plus, FolderKanban, Users, CheckSquare, ArrowRight, Pencil, Trash2, X, AlertCircle } from 'lucide-react';

function ProjectModal({ project, onClose, onSave }) {
  const [form, setForm] = useState({
    name: project?.name || '', description: project?.description || '', status: project?.status || 'active'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Project name is required'); return; }
    setLoading(true);
    try {
      if (project) {
        const res = await api.put(`/projects/${project.id}`, form);
        onSave(res.data.project);
      } else {
        const res = await api.post('/projects', form);
        onSave(res.data.project);
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">{project ? 'Edit Project' : 'New Project'}</h2>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        {error && <div className="alert alert-error"><AlertCircle size={15} />{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Project Name *</label>
            <input type="text" placeholder="e.g. Website Redesign" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea rows={3} placeholder="Brief description of the project..."
              value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              style={{ resize: 'vertical' }} />
          </div>
          {project && (
            <div className="form-group">
              <label className="form-label">Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : (project ? 'Save Changes' : 'Create Project')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Projects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editProject, setEditProject] = useState(null);

  const fetchProjects = () => {
    api.get('/projects').then(res => setProjects(res.data.projects)).finally(() => setLoading(false));
  };

  useEffect(() => { fetchProjects(); }, []);

  const handleSave = (project) => {
    setProjects(prev => {
      const exists = prev.find(p => p.id === project.id);
      return exists ? prev.map(p => p.id === project.id ? { ...p, ...project } : p) : [project, ...prev];
    });
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this project? All tasks will be lost.')) return;
    await api.delete(`/projects/${id}`);
    setProjects(prev => prev.filter(p => p.id !== id));
  };

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-subtitle">{projects.length} project{projects.length !== 1 ? 's' : ''} total</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> New Project
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <FolderKanban className="empty-state-icon" />
            <h3>No projects yet</h3>
            <p>Create your first project to start organizing tasks and collaborating with your team.</p>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              <Plus size={16} /> Create Project
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {projects.map(project => (
            <div key={project.id} className="card" style={{
              position: 'relative', transition: 'border-color 0.2s, transform 0.2s',
              cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 16
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span className={`badge badge-${project.status}`}>{project.status}</span>
                  </div>
                  <h3 style={{ fontSize: 17, marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {project.name}
                  </h3>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {project.description || 'No description provided'}
                  </p>
                </div>
                {(user.role === 'admin' || project.owner_id === user.id) && (
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <button className="btn-icon btn-sm" onClick={e => { e.stopPropagation(); setEditProject(project); }} title="Edit">
                      <Pencil size={13} />
                    </button>
                    <button className="btn-icon btn-sm" onClick={e => { e.stopPropagation(); handleDelete(project.id); }} title="Delete"
                      style={{ color: 'var(--red)' }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 20, padding: '12px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                  <CheckSquare size={13} color="var(--accent)" />
                  {project.task_count} tasks
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                  <Users size={13} color="var(--green)" />
                  {project.member_count} members
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>
                  by {project.owner_name}
                </div>
              </div>

              <Link to={`/projects/${project.id}`} className="btn btn-ghost btn-sm"
                style={{ justifyContent: 'center', width: '100%', fontSize: 12 }}>
                Open Project <ArrowRight size={12} />
              </Link>
            </div>
          ))}
        </div>
      )}

      {(showModal || editProject) && (
        <ProjectModal
          project={editProject}
          onClose={() => { setShowModal(false); setEditProject(null); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
