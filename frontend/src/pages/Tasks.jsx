import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';
import { ArrowLeft, Send, Calendar, Flag, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function Tasks() {
  const { projectId, taskId } = useParams();
  const [task, setTask] = useState(null);
  const [comments, setComments] = useState([]);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get(`/projects/${projectId}/tasks/${taskId}`)
      .then(res => { setTask(res.data.task); setComments(res.data.comments); })
      .finally(() => setLoading(false));
  }, [projectId, taskId]);

  const submitComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setSubmitting(true);
    try {
      const res = await api.post(`/projects/${projectId}/tasks/${taskId}/comments`, { content: comment });
      setComments(prev => [...prev, res.data.comment]);
      setComment('');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  if (!task) return <div>Task not found</div>;

  return (
    <div className="animate-in" style={{ maxWidth: 700 }}>
      <Link to={`/projects/${projectId}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
        <ArrowLeft size={14} /> Back to Project
      </Link>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <span className={`badge badge-${task.status}`}>{task.status.replace('_', ' ')}</span>
          <span className={`badge badge-${task.priority}`}>{task.priority}</span>
        </div>
        <h1 style={{ fontSize: 22, marginBottom: 12 }}>{task.title}</h1>
        {task.description && <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>{task.description}</p>}

        <div style={{ display: 'flex', gap: 20, marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          {task.assignee_name && (
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <User size={12} color="var(--accent)" />
              <strong>Assignee:</strong> {task.assignee_name}
            </div>
          )}
          {task.due_date && (
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Calendar size={12} color="var(--yellow)" />
              <strong>Due:</strong> {task.due_date}
            </div>
          )}
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <User size={12} color="var(--green)" />
            <strong>Reporter:</strong> {task.reporter_name}
          </div>
        </div>
      </div>

      {/* Comments */}
      <div className="card">
        <h3 style={{ marginBottom: 16, fontSize: 15 }}>Comments ({comments.length})</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
          {comments.length === 0 && (
            <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No comments yet. Be the first!</p>
          )}
          {comments.map(c => (
            <div key={c.id} style={{ display: 'flex', gap: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent-dim)', border: '2px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}>{c.user_name[0]}</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{c.user_name}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{c.content}</p>
              </div>
            </div>
          ))}
        </div>
        <form onSubmit={submitComment} style={{ display: 'flex', gap: 10 }}>
          <input type="text" placeholder="Add a comment..." value={comment}
            onChange={e => setComment(e.target.value)} style={{ flex: 1 }} />
          <button className="btn btn-primary" type="submit" disabled={submitting || !comment.trim()}>
            <Send size={14} />
          </button>
        </form>
      </div>
    </div>
  );
}
