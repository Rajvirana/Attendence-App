import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api';

export default function StudentHome() {
  const [classes, setClasses] = useState([]);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setError('');
    try {
      const { classes: list } = await apiFetch('/api/classes');
      setClasses(list);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function join(e) {
    e.preventDefault();
    setError('');
    try {
      await apiFetch('/api/classes/join', {
        method: 'POST',
        body: JSON.stringify({ code }),
      });
      setCode('');
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-white">Student dashboard</h1>
        <p className="text-slate-400">Join a class with the code from your teacher.</p>
      </header>

      <section className="mb-10 rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        <h2 className="text-lg font-medium text-white">Join class</h2>
        <form onSubmit={join} className="mt-4 flex flex-wrap gap-3">
          <input
            className="min-w-[200px] flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm uppercase tracking-widest"
            placeholder="CLASS CODE"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
          />
          <button
            type="submit"
            className="rounded-lg bg-cyan-500 px-6 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
          >
            Join
          </button>
        </form>
        {error && <p className="mt-3 text-sm text-rose-400">{error}</p>}
      </section>

      <section>
        <h2 className="text-lg font-medium text-white">My classes</h2>
        {loading ? (
          <p className="mt-4 text-slate-500">Loading…</p>
        ) : classes.length === 0 ? (
          <p className="mt-4 text-slate-500">You are not enrolled in any class yet.</p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {classes.map((c) => (
              <li key={c.id}>
                <Link
                  to={`/student/class/${c.id}`}
                  className="block rounded-xl border border-slate-800 bg-slate-900/60 p-4 transition hover:border-cyan-500/40"
                >
                  <div className="font-medium text-white">{c.name}</div>
                  <div className="mt-1 text-xs text-slate-500">Teacher: {c.teacher?.name || '—'}</div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
