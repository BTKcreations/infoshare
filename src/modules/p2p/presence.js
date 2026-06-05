import { getGun } from './gun.js';

const heartbeatRegistry = new Map();

export function startHeartbeat(roomId, pubKey) {
  stopHeartbeat(roomId);
  const node = getGun().get('presence').get(roomId).get(pubKey);
  const tick = () => {
    node.put({ ts: Date.now(), pub: pubKey });
  };
  tick();
  const id = setInterval(tick, 5000);
  heartbeatRegistry.set(roomId, { node, id });
}

export function stopHeartbeat(roomId) {
  const h = heartbeatRegistry.get(roomId);
  if (!h) return;
  clearInterval(h.id);
  heartbeatRegistry.delete(roomId);
}

export function watchPresence(roomId, callback) {
  const node = getGun().get('presence').get(roomId);
  const onData = (data) => {
    if (data && data.ts) callback(data);
  };
  node.map().on(onData);
  setTimeout(() => node.map().off(), 100);
  return () => {
    try { node.map().off(); } catch {}
  };
}

export function getActivePeers(roomId, windowMs = 15000) {
  return new Promise((resolve) => {
    const now = Date.now();
    const out = new Set();
    const node = getGun().get('presence').get(roomId);
    const timer = setTimeout(() => resolve(Array.from(out)), 1500);
    node.map().once((data) => {
      if (data && data.ts && now - data.ts < windowMs) {
        out.add(data.pub);
      }
    });
    setTimeout(() => clearTimeout(timer), 100);
  });
}
