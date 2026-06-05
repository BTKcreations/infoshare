import Gun from 'gun';

const RELAYS = [
  'https://gun-manhattan.herokuapp.com/gun',
  'https://peer.warpgun.com/gun',
  'https://gundb-relay-mlccl.ondigitalocean.app/gun'
];

let gunInstance = null;
let gunFailed = false;

function makeStub() {
  const chainable = {
    get: () => chainable,
    put: () => Promise.resolve(),
    once: (cb) => { try { setTimeout(() => cb && cb(null), 0); } catch {} return chainable; },
    on: () => chainable,
    off: () => chainable,
    map: () => ({ on: () => {}, off: () => {}, once: (cb) => { try { setTimeout(() => cb && cb(null), 0); } catch {} } })
  };
  return chainable;
}

export function getGun() {
  if (gunFailed) return makeStub();
  if (gunInstance) return gunInstance;
  try {
    gunInstance = Gun({
      peers: RELAYS,
      localStorage: false,
      radisk: false,
      axe: false,
      multicast: false
    });
  } catch (e) {
    console.warn('[gun] init failed, using offline stub:', e?.message || e);
    gunFailed = true;
    return makeStub();
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('unhandledrejection', (e) => {
      const msg = String(e?.reason?.message || e?.reason || '');
      if (msg.includes('HC(') || msg.includes('work') || msg.includes('SEA')) {
        e.preventDefault();
        console.warn('[gun] suppressed async error:', msg);
      }
    });
  }
  return gunInstance;
}

export function isOnline() {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}
