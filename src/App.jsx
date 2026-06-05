import { useEffect, useState } from 'react';
import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useUser } from './hooks/useUser.js';
import { startActivityWatcher } from './modules/auth/session.js';
import { loadProfile } from './modules/crypto/identity.js';
import { ToastProvider } from './components/Toast.jsx';
import Onboarding from './routes/Onboarding.jsx';
import Unlock from './routes/Unlock.jsx';
import Dashboard from './routes/Dashboard.jsx';
import Room from './routes/Room.jsx';

function AuthGate({ children }) {
  const [state, setState] = useState('loading');
  useEffect(() => {
    (async () => {
      const rec = await loadProfile();
      setState(rec ? 'have-profile' : 'no-profile');
    })();
  }, []);
  if (state === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-ink-400">Loading…</div>
      </div>
    );
  }
  return state === 'no-profile' ? <Navigate to="/onboarding" replace /> : children;
}

function SessionGate({ children }) {
  const user = useUser();
  if (!user) return <Navigate to="/unlock" replace />;
  return children;
}

export default function App() {
  useEffect(() => {
    const stop = startActivityWatcher();
    return stop;
  }, []);

  const Router = typeof window !== 'undefined' && window.location.protocol === 'file:'
    ? HashRouter
    : BrowserRouter;

  return (
    <ToastProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route
            path="/onboarding"
            element={
              <AuthGate>
                <OnboardingGate><Onboarding /></OnboardingGate>
              </AuthGate>
            }
          />
          <Route path="/unlock" element={<Unlock />} />
          <Route
            path="/dashboard"
            element={
              <AuthGate>
                <SessionGate><Dashboard /></SessionGate>
              </AuthGate>
            }
          />
          <Route
            path="/room/:roomId"
            element={
              <AuthGate>
                <SessionGate><Room /></SessionGate>
              </AuthGate>
            }
          />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </ToastProvider>
  );
}

function OnboardingGate({ children }) {
  const user = useUser();
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}
