import { useEffect, useState } from 'react';

export default function PeerStatus({ peers }) {
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    if (!peers?.length) return;
    setPulse(true);
    const t = setTimeout(() => setPulse(false), 800);
    return () => clearTimeout(t);
  }, [peers?.length]);

  return (
    <div className="card p-3 flex items-center gap-3">
      <div className="relative">
        <div className={`w-2.5 h-2.5 rounded-full ${peers?.length ? 'bg-emerald-400' : 'bg-ink-600'}`} />
        {pulse && (
          <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
        )}
      </div>
      <div className="text-xs text-ink-300">
        <span className="font-mono text-emerald-400">{peers?.length || 0}</span> peer{peers?.length === 1 ? '' : 's'} online
      </div>
    </div>
  );
}
