import { Link } from 'react-router-dom';
import { shortHash } from '../modules/crypto/hash.js';
import { relativeTime } from '../utils/time.js';

export default function RoomCard({ room }) {
  return (
    <Link
      to={`/room/${room.id}`}
      className="card p-4 hover:border-chain-500/40 transition-colors block"
    >
      <div className="flex items-center justify-between mb-1">
        <div className="font-semibold text-ink-100">{room.displayName || room.name}</div>
        <div className="text-[11px] text-ink-500">{relativeTime(room.joinedAt)}</div>
      </div>
      <div className="flex items-center gap-2 text-xs text-ink-400">
        <span>#{room.height ?? 0}</span>
        <span className="hash-short">{shortHash(room.lastBlockHash, 6, 4)}</span>
        {room.createdByMe && (
          <span className="ml-auto px-1.5 py-0.5 rounded bg-chain-500/10 text-chain-400">owner</span>
        )}
      </div>
    </Link>
  );
}
