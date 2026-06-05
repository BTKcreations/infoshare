import { useEffect, useState, useRef } from 'react';
import { blocks as blocksStore } from '../modules/storage/profile.js';
import { loadChain } from '../modules/blockchain/chain.js';
import { subscribeRoom, unsubscribeRoom, loadRemoteChain, pubToShort } from '../modules/p2p/roomSync.js';
import { startHeartbeat, stopHeartbeat, watchPresence, getActivePeers } from '../modules/p2p/presence.js';

export function useChain(roomId, roomKeyHex, pubKey) {
  const [blocks, setBlocks] = useState([]);
  const [peers, setPeers] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [revealQueue, setRevealQueue] = useState([]);
  const stopPresenceRef = useRef(null);
  const seenHashes = useRef(new Set());

  const refresh = async () => {
    const local = await loadChain(roomId);
    setBlocks(local);
    return local;
  };

  useEffect(() => {
    if (!roomId) return;
    let cancelled = false;
    (async () => {
      setSyncing(true);
      const local = await refresh();

      const remote = await loadRemoteChain(roomId);
      if (cancelled) return;

      const localByHash = new Map(local.map((b) => [b.hash, b]));
      const ordered = [...local];
      const seen = new Set(local.map((b) => b.hash));
      const queue = [];

      for (const r of remote.sort((a, b) => a.index - b.index)) {
        if (seen.has(r.hash)) continue;
        if (r.index === ordered.length) {
          ordered.push(r);
          seen.add(r.hash);
        } else if (r.index > ordered.length) {
          queue.push(r);
        }
      }

      if (queue.length) {
        queue.sort((a, b) => a.index - b.index);
        for (const r of queue) {
          ordered.push(r);
          seen.add(r.hash);
        }
      }

      const newOnes = remote.filter((r) => !localByHash.has(r.hash)).sort((a, b) => a.index - b.index);
      if (newOnes.length) {
        const existing = await blocksStore.forRoom(roomId);
        for (const b of newOnes) {
          const dup = existing.find((e) => e.hash === b.hash);
          if (!dup) await blocksStore.put({ roomId, ...b });
        }
        setRevealQueue(newOnes);
      } else {
        setRevealQueue([]);
      }

      if (!cancelled) setBlocks(ordered);
      setSyncing(false);

      subscribeRoom(roomId, (b, meta) => {
        setBlocks((prev) => {
          if (prev.find((p) => p.hash === b.hash)) return prev;
          const next = [...prev, b].sort((a, b) => a.index - b.index);
          return next;
        });
        if (!meta?.duplicate && !seenHashes.current.has(b.hash)) {
          seenHashes.current.add(b.hash);
          setRevealQueue((q) => [...q, b]);
        }
      });

      if (pubKey) startHeartbeat(roomId, pubKey);
      stopPresenceRef.current = watchPresence(roomId, async () => {
        const list = await getActivePeers(roomId);
        setPeers(list);
      });
      const peerList = await getActivePeers(roomId);
      setPeers(peerList);
    })();

    return () => {
      cancelled = true;
      unsubscribeRoom(roomId);
      stopHeartbeat(roomId);
      stopPresenceRef.current?.();
    };
  }, [roomId]);

  const consumeReveal = () => setRevealQueue((q) => q.slice(1));

  return { blocks, peers, syncing, revealQueue, consumeReveal, refresh };
}

export function shortPub(pub) {
  return pubToShort(pub);
}
