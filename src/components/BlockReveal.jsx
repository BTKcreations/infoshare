import { motion, AnimatePresence } from 'framer-motion';
import { shortHash } from '../modules/crypto/hash.js';
import { useEffect, useState } from 'react';
import { decryptBlockContent } from '../modules/blockchain/store.js';

export default function BlockReveal({ block, onDone, isMine, shortAuthor }) {
  const isGenesis = block?.index === 0;

  if (!block) return null;

  return (
    <motion.div
      key={block.hash}
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      onAnimationComplete={() => {
        setTimeout(onDone, 1100);
      }}
      className="card p-3 mb-2 border border-ink-800"
    >
      <div className="flex items-center gap-2 text-[11px] text-ink-400 mb-1">
        <span className="px-1.5 py-0.5 rounded bg-chain-500/10 text-chain-400 font-mono">
          #{block.index}
        </span>
        {isGenesis ? (
          <span className="text-yellow-400">GENESIS</span>
        ) : (
          <>
            <span>linking</span>
            <span className="hash-short">{shortHash(block.prevHash, 6, 4)}</span>
          </>
        )}
        <span className="ml-auto hash">{shortHash(block.hash, 6, 4)}</span>
      </div>
      <div className="flex items-center gap-2 text-xs text-ink-400 mb-2">
        <span>by</span>
        <span className="font-mono text-ink-300">{shortAuthor || shortHash(block.authorPubKey, 6, 4)}</span>
        {isMine && <span className="text-chain-400">• you</span>}
      </div>
      {isGenesis ? (
        <div className="text-sm text-ink-300 italic">Room created.</div>
      ) : (
        <BlockMessage block={block} />
      )}
    </motion.div>
  );
}

function BlockMessage({ block }) {
  const [text, setText] = useState('...');
  const [err, setErr] = useState(false);
  useEffect(() => {
    let mounted = true;
    (async () => {
      const ctx = window.__currentRoomContext;
      if (!ctx?.roomKeyHex) {
        setText('(no key)');
        return;
      }
      const t = await decryptBlockContent(block, ctx.roomKeyHex);
      if (!mounted) return;
      if (t == null) {
        setErr(true);
        setText('(unable to decrypt)');
      } else {
        setText(t);
      }
    })();
    return () => { mounted = false; };
  }, [block.hash]);
  if (err) return <div className="text-sm text-red-400 font-mono break-all">{text}</div>;
  return <div className="text-sm text-ink-100 whitespace-pre-wrap break-words">{text}</div>;
}
