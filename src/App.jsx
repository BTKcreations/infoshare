import { Component, useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useUser } from './hooks/useUser.js';
import { startActivityWatcher, getSession } from './modules/auth/session.js';
import { loadProfile } from './modules/crypto/identity.js';
import { ToastProvider } from './components/Toast.jsx';
import Onboarding from './routes/Onboarding.jsx';
import Unlock from './routes/Unlock.jsx';
import Dashboard from './routes/Dashboard.jsx';
import Room from './routes/Room.jsx';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="card p-6 max-w-lg w-full">
            <h1 className="text-xl font-semibold text-red-400 mb-2">Something went wrong</h1>
            <p className="text-sm text-ink-300 mb-3">A runtime error prevented this screen from rendering.</p>
            <pre className="text-xs text-ink-400 bg-ink-950/50 p-3 rounded overflow-auto max-h-48 whitespace-pre-wrap break-words">
              {String(this.state.error?.stack || this.state.error?.message || this.state.error)}
            </pre>
            <button
              className="btn-primary mt-4"
              onClick={() => { this.setState({ error: null }); window.location.hash = '#/'; window.location.reload(); }}
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function AuthGate({ children }) {
  const [state, setState] = useState('loading');
  useEffect(() => {
    (async () => {
      try {
        const rec = await loadProfile();
        setState(rec ? 'have-profile' : 'no-profile');
      } catch (e) {
        console.error('[AuthGate] loadProfile failed', e);
        setState('no-profile');
      }
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

function OnboardingGate({ children }) {
  const user = useUser();
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

function GlobalErrorReporter() {
  useEffect(() => {
    const onError = (event) => {
      console.error('[window.onerror]', event.error || event.message);
    };
    const onRejection = (event) => {
      const reason = event?.reason;
      const msg = String(reason?.message || reason || '');
      if (msg.includes('HC(') || msg.includes('work is not') || msg.includes('SEA')) {
        event.preventDefault();
        console.warn('[suppressed Gun SEA error]', msg);
        return;
      }
      console.error('[unhandledrejection]', reason);
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);
  return null;
}

export default function App() {
  useEffect(() => {
    const stop = startActivityWatcher();
    return stop;
  }, []);

  return (
    <ErrorBoundary>
      <ToastProvider>
        <GlobalErrorReporter />
        <HashRouter>
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
        </HashRouter>
      </ToastProvider>
    </ErrorBoundary>
  );
}
