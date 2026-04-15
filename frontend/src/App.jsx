import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useAuth } from './AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import TeacherHome from './pages/TeacherHome';
import TeacherClass from './pages/TeacherClass';
import StudentHome from './pages/StudentHome';
import StudentClass from './pages/StudentClass';

function ProtectedLayout({ role }) {
  const { user, ready, logout } = useAuth();
  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-400">
        Loading…
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (role && user.role !== role) {
    return <Navigate to={user.role === 'teacher' ? '/teacher' : '/student'} replace />;
  }
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <span className="text-sm font-semibold tracking-tight text-white">Attendance Monitor</span>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-slate-500">
              {user.name} · <span className="capitalize text-slate-400">{user.role}</span>
            </span>
            <button type="button" className="text-cyan-400 hover:underline" onClick={logout}>
              Sign out
            </button>
          </div>
        </div>
      </header>
      <Outlet />
    </div>
  );
}

function GuestOnly({ children }) {
  const { user, ready } = useAuth();
  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-400">
        Loading…
      </div>
    );
  }
  if (user) {
    return <Navigate to={user.role === 'teacher' ? '/teacher' : '/student'} replace />;
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <GuestOnly>
            <Login />
          </GuestOnly>
        }
      />
      <Route
        path="/register"
        element={
          <GuestOnly>
            <Register />
          </GuestOnly>
        }
      />

      <Route element={<ProtectedLayout role="teacher" />}>
        <Route path="/teacher" element={<TeacherHome />} />
        <Route path="/teacher/class/:id" element={<TeacherClass />} />
      </Route>

      <Route element={<ProtectedLayout role="student" />}>
        <Route path="/student" element={<StudentHome />} />
        <Route path="/student/class/:id" element={<StudentClass />} />
      </Route>

      <Route path="/" element={<RoleRedirect />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function RoleRedirect() {
  const { user, ready } = useAuth();
  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-400">
        Loading…
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <Navigate to={user.role === 'teacher' ? '/teacher' : '/student'} replace />;
}
