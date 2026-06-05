import { useState } from 'react';
import { isValidRoomName, isValidPassphrase } from '../utils/id.js';
import { useToast } from './Toast.jsx';

export default function CreateRoomModal({ open, onClose, onCreate }) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const submit = async (e) => {
    e.preventDefault();
    if (!isValidRoomName(name)) return toast.push({ type: 'error', title: 'Room name must be 2-64 chars' });
    if (!isValidPassphrase(password)) return toast.push({ type: 'error', title: 'Password too short' });
    setBusy(true);
    try {
      await onCreate({ name: name.trim(), password });
      toast.push({ type: 'success', title: 'Room created' });
      onClose();
    } catch (err) {
      toast.push({ type: 'error', title: 'Failed', message: err?.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur flex items-center justify-center p-4" onClick={onClose}>
      <div className="card p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-1">Create room</h2>
        <p className="text-xs text-ink-400 mb-4">A new genesis block is anchored to your account.</p>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="label">Room Name *</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="team-alpha" />
          </div>
          <div>
            <label className="label">Password * <span className="text-ink-500">(derives the room key)</span></label>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
