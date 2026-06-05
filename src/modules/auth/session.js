import { activeUser, clearActiveUser } from '../crypto/identity.js';
import { stopHeartbeat } from '../p2p/presence.js';
import { unsubscribeRoom, activeSubscriptions } from '../p2p/roomSync.js';

const LOCK_AFTER_MS = 15 * 60 * 1000;
let lockTimer = null;
const listeners = new Set();

export function getSession() {
  const u = activeUser();
  if (!u) return null;
  return {
    username: u.username,
    fullName: u.fullName,
    pub: u.pub,
    pubKeyShort: u.pub?.slice(0, 8) + '…',
    privJwk: u.privJwk,
    passphraseKeyHex: u.passphraseKeyHex,
    phone: u.phone,
    email: u.email,
    bio: u.bio,
    createdAt: u.createdAt
  };
}

export function onSessionChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  const s = getSession();
  listeners.forEach((fn) => {
    try { fn(s); } catch {}
  });
}

export function lockSession() {
  activeSubscriptions().forEach((rid) => {
    try { unsubscribeRoom(rid); } catch {}
    try { stopHeartbeat(rid); } catch {}
  });
  clearActiveUser();
  if (lockTimer) { clearTimeout(lockTimer); lockTimer = null; }
  notify();
}

export function bumpActivity() {
  if (lockTimer) clearTimeout(lockTimer);
  lockTimer = setTimeout(() => lockSession(), LOCK_AFTER_MS);
}

export function startActivityWatcher() {
  const events = ['mousedown', 'keydown', 'touchstart', 'visibilitychange'];
  const handler = () => {
    if (getSession()) bumpActivity();
  };
  events.forEach((e) => window.addEventListener(e, handler, { passive: true }));
  return () => events.forEach((e) => window.removeEventListener(e, handler));
}
