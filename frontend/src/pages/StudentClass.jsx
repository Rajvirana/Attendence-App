import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiFetch } from '../api';
import { useAuth } from '../AuthContext';
import { createSocket } from '../socket';

export default function StudentClass() {
  const { id } = useParams();
  const { token } = useAuth();
  const [cls, setCls] = useState(null);
  const [session, setSession] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [history, setHistory] = useState([]);
  const [tab, setTab] = useState('attendance');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);

  const loadClass = useCallback(async () => {
    const { class: c } = await apiFetch(`/api/classes/${id}`);
    setCls(c);
  }, [id]);

  const loadSession = useCallback(async () => {
    const { session: s } = await apiFetch(`/api/classes/${id}/sessions/active`);
    setSession(s);
  }, [id]);

  const loadMaterials = useCallback(async () => {
    const { materials: m } = await apiFetch(`/api/classes/${id}/materials`);
    setMaterials(m);
  }, [id]);

  const loadHistory = useCallback(async () => {
    const data = await apiFetch(`/api/classes/${id}/my-attendance`);
    setHistory(data.records);
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setError('');
      try {
        await loadClass();
        await loadSession();
        await loadMaterials();
        await loadHistory();
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadClass, loadSession, loadMaterials, loadHistory]);

  useEffect(() => {
    if (!token || !id) return undefined;
    const socket = createSocket(token);
    socket.emit('join:class', { classId: id });
    socket.on('session:started', (payload) => {
      if (payload.classId === id) loadSession();
    });
    socket.on('session:ended', (payload) => {
      if (payload.classId === id) loadSession();
    });
    socket.on('attendance:update', (payload) => {
      if (payload.classId === id) loadSession();
    });
    const interval = setInterval(loadSession, 12000);
    return () => {
      clearInterval(interval);
      socket.emit('leave:class', { classId: id });
      socket.disconnect();
    };
  }, [token, id, loadSession]);

  async function markAttendance() {
    if (!session?.id || !session.active) return;
    setMarking(true);
    setError('');
    try {
      await apiFetch(`/api/sessions/${session.id}/mark`, { method: 'POST', body: JSON.stringify({}) });
      await loadSession();
      await loadHistory();
    } catch (e) {
      setError(e.message);
    } finally {
      setMarking(false);
    }
  }

  if (loading && !cls) {
    return <div className="p-8 text-slate-400">Loading…</div>;
  }
  if (error && !cls) {
    return (
      <div className="p-8">
        <p className="text-rose-400">{error}</p>
        <Link className="text-cyan-400" to="/student">
          Back
        </Link>
      </div>
    );
  }

  const alreadyMarked = Boolean(session?.myMarked);
  const canMark = session?.active && !alreadyMarked;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link className="text-sm text-cyan-400 hover:underline" to="/student">
        ← My classes
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-white">{cls?.name}</h1>
      <p className="text-sm text-slate-500">Teacher: {cls?.teacher?.name}</p>

      {error && <p className="mt-4 text-sm text-rose-400">{error}</p>}

      <div className="mt-6 flex gap-2 border-b border-slate-800 pb-2">
        {['attendance', 'materials', 'history'].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize ${
              tab === t ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'attendance' && (
        <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          <h2 className="text-lg font-medium text-white">Mark attendance</h2>
          {!session?.active && (
            <p className="mt-2 text-sm text-slate-400">Your teacher has not started attendance yet.</p>
          )}
          {session?.active && (
            <>
              <p className="mt-2 text-sm text-emerald-400">Attendance is open — you can mark once per session.</p>
              <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-400">
                <span>Live present: {session.presentCount}</span>
                <span>Enrolled: {session.totalStudents}</span>
              </div>
              <button
                type="button"
                disabled={!canMark || marking}
                onClick={markAttendance}
                className="mt-6 rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-500 px-6 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-40"
              >
                {alreadyMarked ? 'Already marked' : marking ? 'Submitting…' : 'Mark present'}
              </button>
            </>
          )}
        </section>
      )}

      {tab === 'materials' && (
        <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          <h2 className="text-lg font-medium text-white">Materials</h2>
          <ul className="mt-4 divide-y divide-slate-800">
            {materials.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <div className="font-medium text-white">{m.title}</div>
                  <div className="text-xs text-slate-500">{m.originalName}</div>
                </div>
                <a className="text-sm text-cyan-400 hover:underline" href={m.fileUrl} target="_blank" rel="noreferrer">
                  Open
                </a>
              </li>
            ))}
            {materials.length === 0 && <li className="py-4 text-slate-500">No materials yet.</li>}
          </ul>
        </section>
      )}

      {tab === 'history' && (
        <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          <h2 className="text-lg font-medium text-white">My attendance history</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500">
                  <th className="py-2">Present</th>
                  <th className="py-2">Source</th>
                  <th className="py-2">Session</th>
                </tr>
              </thead>
              <tbody>
                {history.map((row) => (
                  <tr key={row.id} className="border-b border-slate-800/80">
                    <td className="py-2">{row.present ? 'Yes' : 'No'}</td>
                    <td className="py-2 capitalize text-slate-400">{row.source}</td>
                    <td className="py-2 text-xs text-slate-500">
                      {row.session?.startedAt ? new Date(row.session.startedAt).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {history.length === 0 && <p className="mt-4 text-slate-500">No history yet.</p>}
          </div>
        </section>
      )}
    </div>
  );
}
