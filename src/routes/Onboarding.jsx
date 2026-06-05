import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  generateKeypair,
  persistProfile,
  publishUsernameClaim,
  checkUsernameAvailable,
  rememberActiveUser
} from '../modules/crypto/identity.js';
import { normalizeUsername, isValidPassphrase } from '../utils/id.js';
import { useToast } from '../components/Toast.jsx';

export default function Onboarding() {
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState({
    fullName: '',
    username: '',
    phone: '',
    email: '',
    bio: ''
  });
  const [passphrase, setPassphrase] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.fullName.trim()) return toast.push({ type: 'error', title: 'Full name is required' });
    const username = normalizeUsername(form.username);
    if (username.length < 3) return toast.push({ type: 'error', title: 'Username must be 3+ chars' });
    if (!isValidPassphrase(passphrase)) return toast.push({ type: 'error', title: 'Passphrase too short' });
    if (passphrase !== confirm) return toast.push({ type: 'error', title: 'Passphrases do not match' });

    setBusy(true);
    setStatus('Checking username…');
    const avail = await checkUsernameAvailable(username);
    if (!avail.available) {
      setBusy(false);
      setStatus('');
      return toast.push({ type: 'error', title: 'Username taken', message: `Owned by ${avail.takenBy?.slice(0, 10)}…` });
    }

    setStatus('Generating keypair…');
    const { pub, privJwk } = await generateKeypair();

    setStatus('Saving profile locally…');
    const { passphraseKeyHex } = await persistProfile({
      user: { ...form, username, pub },
      privJwk,
      passphrase
    });

    setStatus('Publishing username claim…');
    const pub2 = await publishUsernameClaim(username, pub);

    const user = {
      id: 'me',
      fullName: form.fullName.trim(),
      username,
      phone: form.phone,
      email: form.email,
      bio: form.bio,
      pub,
      createdAt: Date.now()
    };
    rememberActiveUser({ user, privJwk, pub, passphraseKeyHex });

    setBusy(false);
    setStatus('');
    toast.push({ type: 'success', title: 'Welcome!', message: pub2?.offline ? 'Username claim queued (offline).' : 'Account created.' });
    navigate('/dashboard', { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md card p-6 animate-fade-in">
        <div className="mb-6 text-center">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-chain-500/20 items-center justify-center mb-3">
            <div className="w-6 h-6 rounded bg-chain-500" />
          </div>
          <h1 className="text-2xl font-semibold">Create your account</h1>
          <p className="text-sm text-ink-400 mt-1">
            Stored locally on this device. End-to-end encrypted with your passphrase.
          </p>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="label">Full Name *</label>
            <input className="input" value={form.fullName} onChange={(e) => set('fullName', e.target.value)} placeholder="Ada Lovelace" required />
          </div>
          <div>
            <label className="label">Username * <span className="text-ink-500">(unique, public)</span></label>
            <input className="input" value={form.username} onChange={(e) => set('username', e.target.value)} placeholder="ada" required />
          </div>
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="label">Phone <span className="text-ink-500">(local only)</span></label>
              <input className="input" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+1 555 0100" />
            </div>
            <div>
              <label className="label">Email <span className="text-ink-500">(local only)</span></label>
              <input className="input" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="ada@example.com" />
            </div>
          </div>
          <div>
            <label className="label">Bio <span className="text-ink-500">(optional)</span></label>
            <textarea className="input" rows={2} value={form.bio} onChange={(e) => set('bio', e.target.value)} placeholder="A short note about you" />
          </div>
          <div className="pt-2 border-t border-ink-800">
            <label className="label">Unlock Passphrase * <span className="text-ink-500">(local encryption)</span></label>
            <input className="input" type="password" value={passphrase} onChange={(e) => setPassphrase(e.target.value)} placeholder="••••••••" required />
            <input className="input mt-2" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="confirm" required />
            <p className="text-[11px] text-ink-500 mt-1">
              Never sent to the network. Required on every return to the app.
            </p>
          </div>
          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy ? status || 'Working…' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  );
}
