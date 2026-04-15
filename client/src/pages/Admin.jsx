import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api';

function formatTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export default function Admin() {
  const [data, setData] = useState(null);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setError('');
    try {
      const [team, s] = await Promise.all([apiFetch('/api/attendance/team'), apiFetch('/api/attendance/stats')]);
      setData(team);
      setStats(s);
    } catch (e) {
      setError(e.message || 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Team overview</h1>
          <p className="muted">
            <Link to="/">← Back to my attendance</Link>
          </p>
        </div>
      </header>

      {loading && <p className="muted">Loading…</p>}
      {error && <p className="error">{error}</p>}

      {stats && !loading && (
        <section className="card stats-row">
          <div>
            <span className="label">Team members</span>
            <p className="big">{stats.totalUsers}</p>
          </div>
          <div>
            <span className="label">Window</span>
            <p>Last 30 days (check-ins)</p>
          </div>
        </section>
      )}

      {data && !loading && (
        <section className="card">
          <h2>Attendance for {data.date}</h2>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>In</th>
                  <th>Out</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => (
                  <tr key={row.user.id}>
                    <td>{row.user.name}</td>
                    <td className="muted">{row.user.email}</td>
                    <td className="mono">{formatTime(row.attendance?.checkInAt)}</td>
                    <td className="mono">{formatTime(row.attendance?.checkOutAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.rows.length === 0 && <p className="muted pad">No team members yet.</p>}
          </div>
        </section>
      )}

      {stats?.byDay?.length > 0 && (
        <section className="card">
          <h2>Activity (last 30 days)</h2>
          <ul className="bar-list">
            {stats.byDay.map((d) => (
              <li key={d._id}>
                <span className="mono">{d._id}</span>
                <span className="pill">{d.count} check-ins</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
