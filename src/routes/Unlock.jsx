import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { unlockProfile, loadProfile } from '../modules/crypto/identity.js';
import { useToast } from '../components/Toast.jsx';

export default function Unlock() {
  const navigate = useNavigate();
  const toast = useToast();
  const [pass, setPass] = useState('');
  const [busy, setBusy] = useState(false);
  const [rec, setRec] = useState(null);

  useState(() => {
    loadProfile().then(setRec);
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const user = await unlockProfile(pass);
    setBusy(false);
    if (!user) {
      toast.push({ type: 'error', title: 'Wrong passphrase' });
      return;
    }
    toast.push({ type: 'success', title: `Welcome back, ${user.username}` });
    navigate('/dashboard', { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm card p-6 animate-fade-in">
        <div className="mb-5 text-center">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-chain-500/20 items-center justify-center mb-3">
            <div className="w-6 h-6 rounded bg-chain-500" />
          </div>
          <h1 className="text-2xl font-semibold">Unlock</h1>
          {rec && (
            <p className="text-sm text-ink-400 mt-1">
              Hello <span className="text-ink-200">{rec.fullName}</span> · <span className="font-mono text-chain-400">@{rec.username}</span>
            </p>
          )}
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="label">Passphrase</label>
            <input
              className="input"
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              autoFocus
              required
            />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy ? 'Decrypting…' : 'Unlock'}
          </button>
        </form>
      </div>
    </div>
  );
}
