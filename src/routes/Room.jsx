import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useUser } from '../hooks/useUser.js';
import { useChain } from '../hooks/useChain.js';
import { rooms as roomsStore, blocks as blocksStore } from '../modules/storage/profile.js';
import { validateChain } from '../modules/blockchain/chain.js';
import { computeRoomKey, setRoomKey } from '../modules/blockchain/store.js';
import { sendMessage } from '../modules/p2p/roomSync.js';
import { pubToShort } from '../modules/p2p/roomSync.js';
import { useToast } from '../components/Toast.jsx';
import BlockReveal from '../components/BlockReveal.jsx';
import MessageBubble from '../components/MessageBubble.jsx';
import ChainStatus from '../components/ChainStatus.jsx';
import PeerStatus from '../components/PeerStatus.jsx';

export default function Room() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const user = useUser();
  const [room, setRoom] = useState(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [integrity, setIntegrity] = useState(null);
  const [revealed, setRevealed] = useState(new Set());
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!user) {
      navigate('/unlock', { replace: true });
      return;
    }
    (async () => {
      let r = await roomsStore.get(roomId);
      if (!r) {
        navigate('/dashboard', { replace: true });
        return;
      }
      if (!r.roomKey) {
        let password = location.state?.roomKey ? null : prompt(`Re-enter password for "${r.name}" to unlock the room key:`);
        if (password) {
          const key = await computeRoomKey(r.name, password);
          await setRoomKey(roomId, key);
          r = await roomsStore.get(roomId);
        }
      }
      setRoom(r);
    })();
  }, [roomId, user]);

  const { blocks, peers, syncing, revealQueue, consumeReveal, refresh } = useChain(
    roomId,
    room?.roomKey,
    user?.pub
  );

  useEffect(() => {
    if (room) {
      window.__currentRoomContext = { roomKeyHex: room.roomKey };
    }
    return () => { delete window.__currentRoomContext; };
  }, [room?.roomKey]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [blocks.length, revealQueue.length]);

  const tip = blocks.length ? blocks[blocks.length - 1] : null;

  const runIntegrity = async () => {
    const local = await blocksStore.forRoom(roomId);
    const result = await validateChain(local);
    setIntegrity(result);
    if (result.ok) {
      toast.push({ type: 'success', title: 'Chain valid', message: `${result.length} blocks verified` });
    } else {
      toast.push({ type: 'error', title: 'Integrity issue', message: `${result.reason}${result.at != null ? ` @ #${result.at}` : ''}` });
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim() || sending || !user) return;
    setSending(true);
    try {
      await sendMessage({
        roomId,
        message: text.trim(),
        privJwk: user.privJwk,
        pub: user.pub,
        roomKeyHex: room.roomKey
      });
      setText('');
      await refresh();
    } catch (err) {
      toast.push({ type: 'error', title: 'Send failed', message: err?.message });
    } finally {
      setSending(false);
    }
  };

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-ink-400">Loading room…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-ink-800 px-4 py-3 flex items-center gap-3 sticky top-0 bg-ink-950/95 backdrop-blur z-30">
        <button className="btn-ghost px-2 py-1" onClick={() => navigate('/dashboard')}>‹</button>
        <div className="flex-1 min-w-0">
          <div className="font-semibold truncate">{room.displayName || room.name}</div>
          <div className="text-[11px] text-ink-400 font-mono truncate">
            {roomId.slice(0, 12)}…
          </div>
        </div>
        <button className="btn-ghost text-xs" onClick={runIntegrity} title="Verify chain integrity">Verify</button>
      </header>
      <div className="px-4 pt-3 grid grid-cols-2 gap-3 max-w-3xl w-full mx-auto">
        <ChainStatus tip={tip} integrity={integrity} />
        <PeerStatus peers={peers} />
      </div>
      <main className="flex-1 p-4 max-w-3xl w-full mx-auto w-full">
        {syncing && (
          <div className="text-center text-xs text-ink-500 mb-3 animate-pulse">Syncing chain from peers…</div>
        )}
        <div className="space-y-1">
          {blocks.map((b) => {
            const isMine = b.authorPubKey === user?.pub;
            const shortAuthor = pubToShort(b.authorPubKey);

            if (b.index === 0) {
              if (revealed.has(b.hash) || !revealQueue.find((q) => q.hash === b.hash)) {
                return (
                  <div key={b.hash} className="text-center text-xs text-ink-500 my-3">
                    <div className="inline-block px-3 py-1 rounded-full bg-ink-800/60 border border-ink-700">
                      <span className="text-yellow-400">GENESIS</span> · room created
                    </div>
                  </div>
                );
              }
              return null;
            }

            const isRevealing = revealQueue[0]?.hash === b.hash;
            const isRevealed = revealed.has(b.hash);

            if (isRevealing) {
              return (
                <BlockReveal
                  key={b.hash}
                  block={b}
                  isMine={isMine}
                  shortAuthor={shortAuthor}
                  onDone={() => {
                    setRevealed((r) => new Set(r).add(b.hash));
                    consumeReveal();
                  }}
                />
              );
            }
            if (isRevealed) {
              return (
                <MessageBubble
                  key={b.hash}
                  block={b}
                  isMine={isMine}
                  shortAuthor={shortAuthor}
                  roomKeyHex={room.roomKey}
                />
              );
            }
            if (revealQueue.find((q) => q.hash === b.hash)) {
              return (
                <div key={b.hash} className="text-center text-xs text-ink-600 my-1 animate-pulse">
                  waiting…
                </div>
              );
            }
            return (
              <MessageBubble
                key={b.hash}
                block={b}
                isMine={isMine}
                shortAuthor={shortAuthor}
                roomKeyHex={room.roomKey}
              />
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </main>
      <form onSubmit={submit} className="border-t border-ink-800 p-3 sticky bottom-0 bg-ink-950/95 backdrop-blur">
        <div className="max-w-3xl mx-auto flex gap-2">
          <input
            className="input flex-1"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={room.roomKey ? 'Type a message…' : 'Unlock room to send messages'}
            disabled={!room.roomKey || sending}
          />
          <button type="submit" className="btn-primary" disabled={!room.roomKey || sending || !text.trim()}>
            {sending ? '…' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  );
}
