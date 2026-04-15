import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api';
import { useAuth } from '../AuthContext';

function formatTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function Dashboard() {
  const { user } = useAuth();
  const [record, setRecord] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setError('');
    try {
      const [todayRes, histRes] = await Promise.all([
        apiFetch('/api/attendance/today'),
        apiFetch('/api/attendance/my?limit=14'),
      ]);
      setRecord(todayRes.record);
      setHistory(histRes.records || []);
    } catch (e) {
      setError(e.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function checkIn() {
    setActionLoading(true);
    setError('');
    try {
      const { record: r } = await apiFetch('/api/attendance/check-in', { method: 'POST', body: '{}' });
      setRecord(r);
      await refresh();
    } catch (e) {
      setError(e.message || 'Check-in failed');
    } finally {
      setActionLoading(false);
    }
  }

  async function checkOut() {
    setActionLoading(true);
    setError('');
    try {
      const { record: r } = await apiFetch('/api/attendance/check-out', { method: 'POST', body: '{}' });
      setRecord(r);
      await refresh();
    } catch (e) {
      setError(e.message || 'Check-out failed');
    } finally {
      setActionLoading(false);
    }
  }

  const checkedIn = Boolean(record?.checkInAt);
  const checkedOut = Boolean(record?.checkOutAt);

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Today</h1>
          <p className="muted">
            Signed in as <strong>{user?.name}</strong>
            {user?.role === 'admin' && (
              <>
                {' '}
                · <Link to="/admin">Team overview</Link>
              </>
            )}
          </p>
        </div>
      </header>

      {loading ? (
        <p className="muted">Loading…</p>
      ) : (
        <>
          <section className="card highlight">
            <div className="status-grid">
              <div>
                <span className="label">Check in</span>
                <p className="mono big">{formatTime(record?.checkInAt)}</p>
              </div>
              <div>
                <span className="label">Check out</span>
                <p className="mono big">{formatTime(record?.checkOutAt)}</p>
              </div>
            </div>
            {error && <p className="error">{error}</p>}
            <div className="actions">
              <button type="button" className="btn primary" onClick={checkIn} disabled={checkedIn || actionLoading}>
                Check in
              </button>
              <button
                type="button"
                className="btn secondary"
                onClick={checkOut}
                disabled={!checkedIn || checkedOut || actionLoading}
              >
                Check out
              </button>
            </div>
          </section>

          <section className="card">
            <h2>Recent days</h2>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>In</th>
                    <th>Out</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((row) => (
                    <tr key={row._id || row.date}>
                      <td className="mono">{row.date}</td>
                      <td className="mono">{formatTime(row.checkInAt)}</td>
                      <td className="mono">{formatTime(row.checkOutAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {history.length === 0 && <p className="muted pad">No history yet.</p>}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
