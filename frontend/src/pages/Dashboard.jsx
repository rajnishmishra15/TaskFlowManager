import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { FolderKanban, CheckCircle2, AlertTriangle, Clock, TrendingUp, ArrowRight } from 'lucide-react';
import { formatDistanceToNow, parseISO, isPast } from 'date-fns';

const STATUS_COLORS = {
  todo: 'var(--text-muted)',
  in_progress: 'var(--blue)',
  review: 'var(--yellow)',
  done: 'var(--green)'
};

const STATUS_LABELS = { todo: 'To Do', in_progress: 'In Progress', review: 'In Review', done: 'Done' };

const PRIORITY_COLORS = { low: 'var(--text-muted)', medium: 'var(--blue)', high: 'var(--yellow)', urgent: 'var(--red)' };

function StatCard({ icon: Icon, label, value, color, sub }) {
  return (
    <div className="card" style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
        background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <Icon size={20} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 28, fontFamily: 'Syne', fontWeight: 800, lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

function ProgressBar({ label, count, total, color }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12 }}>
        <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
        <span style={{ color, fontWeight: 600 }}>{count}</span>
      </div>
      <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`, background: color, borderRadius: 3,
          transition: 'width 0.6s ease'
        }} />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard').then(res => setData(res.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  if (!data) return null;

  const { stats, myTaskStats, allTaskStats, overdueTasks, recentTasks } = data;
  const totalTasks = allTaskStats.reduce((s, t) => s + t.count, 0);

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Welcome back, {user?.name} · {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        <StatCard icon={FolderKanban} label="Total Projects" value={stats.totalProjects} color="var(--accent)" />
        <StatCard icon={Clock} label="My Open Tasks" value={stats.myTasks - stats.completedTasks} color="var(--blue)" />
        <StatCard icon={CheckCircle2} label="Completed" value={stats.completedTasks} color="var(--green)" />
        <StatCard icon={AlertTriangle} label="Overdue" value={stats.overdueTasks} color="var(--red)"
          sub={stats.overdueTasks > 0 ? 'Needs attention' : 'All on track'} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Task Progress */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <TrendingUp size={16} color="var(--accent)" />
            <h3 style={{ fontSize: 15 }}>Overall Task Progress</h3>
          </div>
          {[
            { key: 'todo', label: STATUS_LABELS.todo, color: 'var(--text-muted)' },
            { key: 'in_progress', label: STATUS_LABELS.in_progress, color: 'var(--blue)' },
            { key: 'review', label: STATUS_LABELS.review, color: 'var(--yellow)' },
            { key: 'done', label: STATUS_LABELS.done, color: 'var(--green)' },
          ].map(({ key, label, color }) => {
            const found = allTaskStats.find(s => s.status === key);
            return <ProgressBar key={key} label={label} count={found?.count || 0} total={totalTasks} color={color} />;
          })}
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>{totalTasks} tasks total</div>
        </div>

        {/* Overdue Tasks */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={16} color="var(--red)" />
              <h3 style={{ fontSize: 15 }}>Overdue Tasks</h3>
            </div>
            {overdueTasks.length > 0 && (
              <span className="badge badge-urgent">{overdueTasks.length}</span>
            )}
          </div>
          {overdueTasks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)' }}>
              <CheckCircle2 size={32} style={{ margin: '0 auto 8px', display: 'block' }} color="var(--green)" />
              <p style={{ fontSize: 13 }}>No overdue tasks! 🎉</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {overdueTasks.slice(0, 4).map(task => (
                <Link key={task.id} to={`/projects/${task.project_id}`} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 12px', background: 'var(--red-dim)', borderRadius: 8,
                  border: '1px solid rgba(248,113,113,0.2)', transition: 'opacity 0.15s'
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{task.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{task.project_name}</div>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--red)', textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                    Due {task.due_date}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Tasks */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontSize: 15 }}>Recent Activity</h3>
          <Link to="/projects" className="btn btn-ghost btn-sm" style={{ fontSize: 12 }}>
            View all <ArrowRight size={12} />
          </Link>
        </div>
        {recentTasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: 13 }}>
            No tasks yet. Create a project and add tasks to get started.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {recentTasks.map((task, i) => (
              <Link key={task.id} to={`/projects/${task.project_id}`} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '12px 0', borderBottom: i < recentTasks.length - 1 ? '1px solid var(--border)' : 'none',
                transition: 'opacity 0.15s'
              }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  background: STATUS_COLORS[task.status]
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{task.project_name}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <span className={`badge badge-${task.status}`}>{STATUS_LABELS[task.status]}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {formatDistanceToNow(new Date(task.updated_at), { addSuffix: true })}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
