import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiFetch, apiUrl } from '../api';
import { useAuth } from '../AuthContext';
import { createSocket } from '../socket';

export default function TeacherClass() {
  const { id } = useParams();
  const { token } = useAuth();
  const [cls, setCls] = useState(null);
  const [session, setSession] = useState(null);
  const [live, setLive] = useState(null);
  const [records, setRecords] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [logs, setLogs] = useState([]);
  const [logDate, setLogDate] = useState('');
  const [tab, setTab] = useState('live');
  const [title, setTitle] = useState('');
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const loadClass = useCallback(async () => {
    const { class: c } = await apiFetch(`/api/classes/${id}`);
    setCls(c);
  }, [id]);

  const loadSession = useCallback(async () => {
    const { session: s } = await apiFetch(`/api/classes/${id}/sessions/active`);
    setSession(s);
    if (s?.id) {
      setLive({
        presentCount: s.presentCount,
        markedCount: s.markedCount,
        totalStudents: s.totalStudents,
      });
      const rec = await apiFetch(`/api/sessions/${s.id}/records`);
      setRecords(rec.records);
    } else {
      setRecords([]);
    }
  }, [id]);

  const loadMaterials = useCallback(async () => {
    const { materials: m } = await apiFetch(`/api/classes/${id}/materials`);
    setMaterials(m);
  }, [id]);

  const loadLogs = useCallback(async () => {
    const q = logDate ? `?date=${encodeURIComponent(logDate)}` : '';
    const data = await apiFetch(`/api/classes/${id}/logs${q}`);
    setLogs(data.records);
  }, [id, logDate]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setError('');
      try {
        await loadClass();
        await loadSession();
        await loadMaterials();
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadClass, loadSession, loadMaterials]);

  useEffect(() => {
    if (tab !== 'logs') return undefined;
    let cancelled = false;
    (async () => {
      try {
        await loadLogs();
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab, loadLogs]);

  useEffect(() => {
    if (!token || !id) return undefined;
    const socket = createSocket(token);
    socket.emit('join:class', { classId: id });
    socket.on('attendance:update', (payload) => {
      if (payload.classId === id) {
        setLive({
          presentCount: payload.presentCount,
          markedCount: payload.markedCount,
          totalStudents: payload.totalStudents,
        });
      }
    });
    socket.on('session:started', (payload) => {
      if (payload.classId === id) {
        loadSession();
      }
    });
    socket.on('session:ended', (payload) => {
      if (payload.classId === id) {
        loadSession();
      }
    });
    const interval = setInterval(() => {
      loadSession();
    }, 12000);
    return () => {
      clearInterval(interval);
      socket.emit('leave:class', { classId: id });
      socket.disconnect();
    };
  }, [token, id, loadSession]);

  async function startAttendance() {
    setActionLoading(true);
    setError('');
    try {
      await apiFetch(`/api/classes/${id}/sessions/start`, { method: 'POST' });
      await loadSession();
    } catch (e) {
      setError(e.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function stopAttendance() {
    setActionLoading(true);
    setError('');
    try {
      await apiFetch(`/api/classes/${id}/sessions/stop`, { method: 'POST' });
      await loadSession();
    } catch (e) {
      setError(e.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function setManual(studentId, present) {
    if (!session?.id) return;
    setError('');
    try {
      await apiFetch(`/api/sessions/${session.id}/manual`, {
        method: 'PATCH',
        body: JSON.stringify({ studentId, present }),
      });
      const rec = await apiFetch(`/api/sessions/${session.id}/records`);
      setRecords(rec.records);
      await loadSession();
    } catch (e) {
      setError(e.message);
    }
  }

  async function uploadMaterial(e) {
    e.preventDefault();
    if (!file || !title.trim()) return;
    setError('');
    const fd = new FormData();
    fd.append('file', file);
    fd.append('title', title);
    try {
      const authToken = localStorage.getItem('token');
      const res = await fetch(apiUrl(`/api/classes/${id}/materials`), {
        method: 'POST',
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Upload failed');
      }
      setTitle('');
      setFile(null);
      await loadMaterials();
    } catch (e) {
      setError(e.message);
    }
  }

  const students = cls?.students || [];

  const recordByStudent = useMemo(() => {
    const m = new Map();
    records.forEach((r) => {
      const sid = r.student?.id || r.student?._id;
      if (sid) m.set(String(sid), r);
    });
    return m;
  }, [records]);

  if (loading && !cls) {
    return <div className="p-8 text-slate-400">Loading…</div>;
  }
  if (error && !cls) {
    return (
      <div className="p-8">
        <p className="text-rose-400">{error}</p>
        <Link className="text-cyan-400" to="/teacher">
          Back
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link className="text-sm text-cyan-400 hover:underline" to="/teacher">
            ← Classes
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-white">{cls?.name}</h1>
          <p className="font-mono text-sm text-cyan-400">Code: {cls?.code}</p>
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-rose-400">{error}</p>}

      <div className="mb-6 flex gap-2 border-b border-slate-800 pb-2">
        {['live', 'materials', 'logs'].map((t) => (
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

      {tab === 'live' && (
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
            <h2 className="text-lg font-medium text-white">Live attendance</h2>
            <p className="mt-1 text-sm text-slate-400">Students can only mark attendance while a session is active.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={Boolean(session?.active) || actionLoading}
                onClick={startAttendance}
                className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-40"
              >
                Start attendance
              </button>
              <button
                type="button"
                disabled={!session?.active || actionLoading}
                onClick={stopAttendance}
                className="rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
              >
                Stop attendance
              </button>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="text-xs uppercase text-slate-500">Present (live)</div>
                <div className="mt-1 text-3xl font-semibold text-emerald-400">{live?.presentCount ?? session?.presentCount ?? 0}</div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="text-xs uppercase text-slate-500">Marked</div>
                <div className="mt-1 text-3xl font-semibold text-cyan-400">{live?.markedCount ?? session?.markedCount ?? 0}</div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="text-xs uppercase text-slate-500">Enrolled</div>
                <div className="mt-1 text-3xl font-semibold text-white">{live?.totalStudents ?? session?.totalStudents ?? students.length}</div>
              </div>
            </div>
            {session?.active && session?.id && (
              <p className="mt-4 text-xs text-slate-500">
                Session ID: <span className="font-mono text-slate-400">{session.id}</span>
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
            <h2 className="text-lg font-medium text-white">Manual attendance</h2>
            <p className="mt-1 text-sm text-slate-400">Override or set attendance for each student.</p>
            {!session?.active ? (
              <p className="mt-4 text-sm text-slate-500">Start a session to enable manual marking.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500">
                      <th className="py-2">Student</th>
                      <th className="py-2">Status</th>
                      <th className="py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s) => {
                      const sid = s.id || s._id;
                      const r = recordByStudent.get(sid);
                      return (
                        <tr key={sid} className="border-b border-slate-800/80">
                          <td className="py-2">
                            <div className="font-medium text-white">{s.name}</div>
                            <div className="text-xs text-slate-500">{s.email}</div>
                          </td>
                          <td className="py-2">
                            {r ? (
                              <span className={r.present ? 'text-emerald-400' : 'text-rose-400'}>
                                {r.present ? 'Present' : 'Absent'} ({r.source})
                              </span>
                            ) : (
                              <span className="text-slate-500">—</span>
                            )}
                          </td>
                          <td className="py-2">
                            <div className="flex gap-2">
                              <button
                                type="button"
                                className="rounded bg-emerald-500/20 px-2 py-1 text-xs text-emerald-300 hover:bg-emerald-500/30"
                                onClick={() => setManual(sid, true)}
                              >
                                Present
                              </button>
                              <button
                                type="button"
                                className="rounded bg-rose-500/20 px-2 py-1 text-xs text-rose-300 hover:bg-rose-500/30"
                                onClick={() => setManual(sid, false)}
                              >
                                Absent
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      {tab === 'materials' && (
        <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          <h2 className="text-lg font-medium text-white">Study materials</h2>
          <form onSubmit={uploadMaterial} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="text-xs uppercase text-slate-500">Title</label>
              <input
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs uppercase text-slate-500">File (PDF / DOC)</label>
              <input
                type="file"
                className="mt-1 block w-full text-sm text-slate-400"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                accept=".pdf,.doc,.docx,.txt"
              />
            </div>
            <button
              type="submit"
              className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950"
            >
              Upload
            </button>
          </form>
          <ul className="mt-6 divide-y divide-slate-800">
            {materials.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <div className="font-medium text-white">{m.title}</div>
                  <div className="text-xs text-slate-500">{m.originalName}</div>
                </div>
                <a
                  className="text-sm text-cyan-400 hover:underline"
                  href={m.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Download
                </a>
              </li>
            ))}
            {materials.length === 0 && <li className="py-4 text-slate-500">No materials yet.</li>}
          </ul>
        </section>
      )}

      {tab === 'logs' && (
        <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="flex flex-wrap items-end gap-4">
            <h2 className="text-lg font-medium text-white">Attendance logs</h2>
            <div>
              <label className="text-xs uppercase text-slate-500">Filter by date (UTC)</label>
              <input
                type="date"
                className="mt-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                value={logDate}
                onChange={(e) => setLogDate(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-300"
              onClick={() => setLogDate('')}
            >
              Clear filter
            </button>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500">
                  <th className="py-2">Student</th>
                  <th className="py-2">Present</th>
                  <th className="py-2">Source</th>
                  <th className="py-2">Session</th>
                  <th className="py-2">Marked</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((row) => (
                  <tr key={row.id} className="border-b border-slate-800/80">
                    <td className="py-2 text-white">{row.student?.name}</td>
                    <td className="py-2">{row.present ? 'Yes' : 'No'}</td>
                    <td className="py-2 capitalize text-slate-400">{row.source}</td>
                    <td className="py-2 text-xs text-slate-500">
                      {row.session?.startedAt ? new Date(row.session.startedAt).toLocaleString() : '—'}
                    </td>
                    <td className="py-2 text-xs text-slate-500">{new Date(row.markedAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {logs.length === 0 && <p className="mt-4 text-slate-500">No records for this filter.</p>}
          </div>
        </section>
      )}
    </div>
  );
}
