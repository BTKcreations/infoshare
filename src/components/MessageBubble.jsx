import { shortHash } from '../modules/crypto/hash.js';
import { useEffect, useState } from 'react';
import { decryptBlockContent } from '../modules/blockchain/store.js';
import { formatTime } from '../utils/time.js';

export default function MessageBubble({ block, isMine, shortAuthor, roomKeyHex }) {
  const [text, setText] = useState(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const t = await decryptBlockContent(block, roomKeyHex);
      if (!mounted) return;
      if (t == null) { setErr(true); setText('(unable to decrypt)'); }
      else setText(t);
    })();
    return () => { mounted = false; };
  }, [block.hash, roomKeyHex]);

  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-2`}>
      <div className={`max-w-[78%] rounded-2xl px-3 py-2 ${isMine ? 'bg-chain-500/15 border border-chain-500/30' : 'bg-ink-800/70 border border-ink-700'}`}>
        <div className="flex items-center gap-2 text-[11px] text-ink-400 mb-1">
          <span className="font-mono text-chain-400">#{block.index}</span>
          <span className="font-mono text-ink-300">{shortAuthor || shortHash(block.authorPubKey, 6, 4)}</span>
          {isMine && <span className="text-chain-400">• you</span>}
          <span className="ml-auto text-ink-500">{formatTime(block.timestamp)}</span>
        </div>
        {err ? (
          <div className="text-sm text-red-400 font-mono break-all">{text}</div>
        ) : text == null ? (
          <div className="text-sm text-ink-500 italic">decrypting…</div>
        ) : (
          <div className="text-sm text-ink-100 whitespace-pre-wrap break-words">{text}</div>
        )}
      </div>
    </div>
  );
}
