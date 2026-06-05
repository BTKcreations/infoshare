import { shortHash } from '../modules/crypto/hash.js';

export default function ChainStatus({ tip, integrity }) {
  return (
    <div className="card p-3">
      <div className="text-xs text-ink-400 mb-1">Chain tip</div>
      <div className="flex items-center gap-2">
        <span className="px-2 py-0.5 rounded bg-chain-500/10 text-chain-400 font-mono text-sm">
          #{tip?.index ?? 0}
        </span>
        <span className="hash-short">{shortHash(tip?.hash, 8, 6)}</span>
      </div>
      {integrity && (
        <div className={`mt-2 text-xs ${integrity.ok ? 'text-emerald-400' : 'text-red-400'}`}>
          {integrity.ok
            ? `Verified • ${integrity.length} blocks`
            : `Integrity issue: ${integrity.reason}${integrity.at != null ? ` @ #${integrity.at}` : ''}`}
        </div>
      )}
    </div>
  );
}
