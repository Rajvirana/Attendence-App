import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api';

export default function TeacherHome() {
  const [classes, setClasses] = useState([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
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

  async function createClass(e) {
    e.preventDefault();
    setError('');
    try {
      await apiFetch('/api/classes', {
        method: 'POST',
        body: JSON.stringify({ name, description }),
      });
      setName('');
      setDescription('');
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-white">Teacher dashboard</h1>
        <p className="text-slate-400">Create classes and share the class code with students.</p>
      </header>

      <section className="mb-10 rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        <h2 className="text-lg font-medium text-white">New class</h2>
        <form onSubmit={createClass} className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="text-xs uppercase text-slate-500">Name</label>
            <input
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. DevOps 101"
              required
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs uppercase text-slate-500">Description (optional)</label>
            <input
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          {error && <p className="sm:col-span-2 text-sm text-rose-400">{error}</p>}
          <button
            type="submit"
            className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
          >
            Create class
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-medium text-white">Your classes</h2>
        {loading ? (
          <p className="mt-4 text-slate-500">Loading…</p>
        ) : classes.length === 0 ? (
          <p className="mt-4 text-slate-500">No classes yet.</p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {classes.map((c) => (
              <li key={c.id}>
                <Link
                  to={`/teacher/class/${c.id}`}
                  className="block rounded-xl border border-slate-800 bg-slate-900/60 p-4 transition hover:border-cyan-500/40"
                >
                  <div className="font-medium text-white">{c.name}</div>
                  <div className="mt-1 font-mono text-sm text-cyan-400">Code: {c.code}</div>
                  <div className="mt-2 text-xs text-slate-500">{c.studentCount} students</div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
